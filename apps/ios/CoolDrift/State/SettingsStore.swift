// SettingsStore.swift — the user's settings, saved on the phone.
// Any screen reads or changes them with:  @Environment(SettingsStore.self) var settings

import Foundation
import Observation

struct Settings: Codable, Equatable {
    var language: Language = .device
    var largeText = false
    var seniorMode = false
    var highAlerts = true // notify when risk becomes High
    var workerMode = false // rest/water reminders
    var workerInterval = 30 // minutes between reminders
    var demoHigh = false // pretend risk is High (for demos)

    private static let key = "cooldrift.settings"

    init() {}

    // Missing keys keep their default, so adding a setting later doesn't wipe the others.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = Settings()
        language = try c.decodeIfPresent(Language.self, forKey: .language) ?? d.language
        largeText = try c.decodeIfPresent(Bool.self, forKey: .largeText) ?? d.largeText
        seniorMode = try c.decodeIfPresent(Bool.self, forKey: .seniorMode) ?? d.seniorMode
        highAlerts = try c.decodeIfPresent(Bool.self, forKey: .highAlerts) ?? d.highAlerts
        workerMode = try c.decodeIfPresent(Bool.self, forKey: .workerMode) ?? d.workerMode
        workerInterval = try c.decodeIfPresent(Int.self, forKey: .workerInterval) ?? d.workerInterval
        demoHigh = try c.decodeIfPresent(Bool.self, forKey: .demoHigh) ?? d.demoHigh
    }

    /// Reads saved settings (also used by the background check).
    static func load() -> Settings {
        guard let data = UserDefaults.standard.data(forKey: key),
              let saved = try? JSONDecoder().decode(Settings.self, from: data)
        else { return Settings() }
        return saved
    }

    func save() {
        UserDefaults.standard.set(try? JSONEncoder().encode(self), forKey: Self.key)
    }
}

@Observable
final class SettingsStore {
    var value: Settings {
        didSet {
            value.save()
            L10n.shared.language = value.language
        }
    }

    init() {
        value = Settings.load()
        L10n.shared.language = value.language
    }

    /// Large text and senior mode both make all text bigger.
    var bigText: Bool { value.largeText || value.seniorMode }
}
