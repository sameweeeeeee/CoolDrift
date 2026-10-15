// Notifier.swift — local alerts (no internet or server needed).
//  • High-heat alert: one notification + vibration when the risk turns High.
//  • Worker reminders: a repeating "rest and drink water" notification.

import AudioToolbox
import UserNotifications

enum Notifier {
    private static let restID = "cooldrift.rest"
    private static let lastRiskKey = "cooldrift.lastRisk"
    private static var center: UNUserNotificationCenter { .current() }

    /// Buzzes a few times, so it's easy to feel in a pocket.
    static func vibrate() {
        for i in 0..<3 {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.9) {
                AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
            }
        }
    }

    /// Asks for permission to show notifications. Returns true if allowed.
    static func ensurePermission() async -> Bool {
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral: return true
        case .denied: return false
        default: return (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
        }
    }

    private static func content(title: String, body: String, rest: Bool = false) -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = title
        c.body = body
        c.sound = .default
        if rest { c.userInfo = ["kind": "rest"] } // lets the app read it aloud
        return c
    }

    /// Sends the "High heat" alert right now and vibrates the phone.
    static func sendHighHeatAlert() async {
        vibrate()
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content(title: t("notif.highTitle"), body: t("notif.highBody")),
            trigger: nil // nil = show now
        )
        try? await center.add(request)
    }

    /// Call every time we get a new risk level. It only alerts when the risk
    /// CHANGES to High (not every 15 minutes while it stays High).
    static func alertIfRiskBecameHigh(_ risk: RiskLevel, alertsOn: Bool) async {
        let last = UserDefaults.standard.string(forKey: lastRiskKey)
        UserDefaults.standard.set(risk.rawValue, forKey: lastRiskKey)
        guard alertsOn, risk == .high, last != RiskLevel.high.rawValue else { return }
        if await ensurePermission() { await sendHighHeatAlert() } else { vibrate() }
    }

    /// Starts repeating rest reminders every `minutes`. Replaces any old ones.
    static func startWorkerReminders(every minutes: Int) async {
        stopWorkerReminders()
        guard await ensurePermission() else { return }
        let request = UNNotificationRequest(
            identifier: restID,
            content: content(title: t("notif.restTitle"), body: t("notif.restBody"), rest: true),
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(minutes * 60), repeats: true)
        )
        try? await center.add(request)
    }

    static func stopWorkerReminders() {
        center.removePendingNotificationRequests(withIdentifiers: [restID])
    }

    /// One rest reminder in 2 seconds (for the "test" button and demos).
    static func sendTestReminder() async -> Bool {
        guard await ensurePermission() else { return false }
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content(title: t("notif.restTitle"), body: t("notif.restBody"), rest: true),
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2, repeats: false)
        )
        try? await center.add(request)
        return true
    }
}
