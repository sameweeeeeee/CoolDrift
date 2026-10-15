// BackgroundCheck.swift — checks the heat while the app is closed or in the background.
//
// iOS decides exactly when this runs (it can be much less often than asked).
// So this is a "bonus" safety net. While the app is OPEN, HeatStore checks every
// 15 minutes on its own.

import BackgroundTasks

enum BackgroundCheck {
    static let taskID = "com.cooldrift.app.heatcheck"

    /// Must be called before the app finishes launching.
    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskID, using: .main) { task in
            let work = Task { @MainActor in
                await run()
                task.setTaskCompleted(success: true)
            }
            task.expirationHandler = { work.cancel() }
            schedule() // ask for the next one
        }
    }

    /// Asks iOS to run the check again in about 15 minutes.
    static func schedule() {
        let request = BGAppRefreshTaskRequest(identifier: taskID)
        request.earliestBeginDate = .now.addingTimeInterval(15 * 60)
        try? BGTaskScheduler.shared.submit(request) // fails in the Simulator; that's fine
    }

    private static func run() async {
        let settings = Settings.load()
        guard settings.highAlerts else { return }
        L10n.shared.language = settings.language // so the notification is in the right language
        let here = LocationService.lastKnown // no GPS in the background; use the last saved spot
        guard let reading = try? await WeatherService.reading(at: here) else { return }
        await Notifier.alertIfRiskBecameHigh(settings.demoHigh ? .high : reading.risk, alertsOn: true)
    }
}
