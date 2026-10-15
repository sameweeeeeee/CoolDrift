// Shortcuts.swift — things you can ask Siri without opening the app:
//   "Is it safe to go out in CoolDrift?"   → the heat risk near you, read out
//   "Find a cool place with CoolDrift"     → the nearest cool place, read out
// They also appear in the Shortcuts app and in Spotlight search.
// The answer uses the app's language (Settings → Language) and the last saved location.

import AppIntents

struct HeatCheckIntent: AppIntent {
    static let title: LocalizedStringResource = "Is it safe to go out?"
    static let description = IntentDescription("Tells you the heat risk near you right now.")

    @MainActor func perform() async throws -> some IntentResult & ProvidesDialog {
        let settings = Settings.load()
        L10n.shared.language = settings.language
        let reading = try? await WeatherService.reading(at: LocationService.lastKnown)
        guard let risk = settings.demoHigh ? RiskLevel.high : reading?.risk else {
            return .result(dialog: "\(t("chat.a.noData"))")
        }
        return .result(dialog: "\(t("chat.a.safe_\(risk.rawValue)"))")
    }
}

struct NearestCoolPlaceIntent: AppIntent {
    static let title: LocalizedStringResource = "Find a cool place"
    static let description = IntentDescription("Tells you the nearest air-conditioned, shaded or green place.")

    @MainActor func perform() async throws -> some IntentResult & ProvidesDialog {
        L10n.shared.language = Settings.load().language
        guard let near = CoolSpots.nearest(to: LocationService.lastKnown) else {
            return .result(dialog: "\(t("chat.a.unknown"))")
        }
        let answer = t("chat.a.nearest", [
            "name": near.spot.name,
            "type": near.spot.type.label,
            "cooling": near.spot.cooling.label,
            "dist": formatDistance(near.distance),
            "note": near.spot.note ?? "",
        ])
        return .result(dialog: "\(answer)")
    }
}

struct CoolDriftShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: HeatCheckIntent(),
            phrases: [
                "Is it safe to go out in \(.applicationName)",
                "Check the heat with \(.applicationName)",
                "\(.applicationName) heat check",
            ],
            shortTitle: "Heat check",
            systemImageName: "thermometer.sun.fill"
        )
        AppShortcut(
            intent: NearestCoolPlaceIntent(),
            phrases: [
                "Find a cool place with \(.applicationName)",
                "Nearest cool place in \(.applicationName)",
            ],
            shortTitle: "Nearest cool place",
            systemImageName: "map.fill"
        )
    }
}
