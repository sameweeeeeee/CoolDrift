// CoolDriftApp.swift — the first thing that runs.
// It creates the shared state (settings, heat data, which tab is open),
// registers the background heat check, and handles notifications.

import SwiftUI
import UserNotifications

@main
struct CoolDriftApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var settings = SettingsStore()
    @State private var heat = HeatStore()
    @State private var router = AppRouter()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
                .environment(heat)
                .environment(router)
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        BackgroundCheck.register()
        return true
    }

    /// Show notifications even while the app is open. Rest reminders are also
    /// read aloud, so riders don't need to look at the phone.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        let isRest = notification.request.content.userInfo["kind"] as? String == "rest"
        if isRest {
            await MainActor.run {
                Notifier.vibrate()
                Speech.speak(t("notif.restSpeech"), language: L10n.shared.language)
            }
        }
        return [.banner, .list, .sound]
    }
}
