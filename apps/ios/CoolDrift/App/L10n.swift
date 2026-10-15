// L10n.swift — translations (English, 中文, Bahasa Melayu, தமிழ்).
//
// The text lives in Resources/Strings/<language>.json, as flat keys like "risk.low".
// The app has its own language picker (in Settings), so we don't use the phone's
// language after the first launch. Missing keys fall back to English.
// "%{name}" in a string means "put a value here", e.g. t("routes.to", ["name": "Bishan"]).

import Foundation
import Observation

enum Language: String, CaseIterable, Codable, Identifiable {
    case en, zh, ms, ta

    var id: String { rawValue }

    /// Shown in Settings, each written in its own script.
    var label: String {
        switch self {
        case .en: "English"
        case .zh: "中文"
        case .ms: "Bahasa Melayu"
        case .ta: "தமிழ்"
        }
    }

    /// Voice to use for read-aloud.
    var speechCode: String {
        switch self {
        case .en: "en-SG"
        case .zh: "zh-CN"
        case .ms: "ms-MY"
        case .ta: "ta-IN"
        }
    }

    /// Used to format times like "9:45 AM".
    var locale: Locale { Locale(identifier: "\(rawValue)_SG") }

    /// The phone's language, if we support it.
    static var device: Language {
        let code = Locale.preferredLanguages.first.map { String($0.prefix(2)) } ?? "en"
        return Language(rawValue: code) ?? .en
    }
}

@Observable
final class L10n {
    static let shared = L10n()

    /// Views that call t() redraw when this changes.
    var language: Language = .device

    @ObservationIgnored private var tables: [Language: [String: Any]] = [:]

    private init() {
        for lang in Language.allCases {
            guard let url = Bundle.main.url(forResource: lang.rawValue, withExtension: "json"),
                  let data = try? Data(contentsOf: url),
                  let table = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            else { continue }
            tables[lang] = table
        }
    }

    private func lookup(_ key: String) -> Any? {
        tables[language]?[key] ?? tables[.en]?[key]
    }

    func text(_ key: String, _ args: [String: Any] = [:]) -> String {
        guard var value = lookup(key) as? String else { return key }
        for (name, arg) in args {
            value = value.replacingOccurrences(of: "%{\(name)}", with: "\(arg)")
        }
        return value
    }

    func list(_ key: String) -> [String] {
        lookup(key) as? [String] ?? []
    }
}

/// Translate one key, e.g. t("risk.high") or t("routes.stops", ["count": 2]).
func t(_ key: String, _ args: [String: Any] = [:]) -> String {
    L10n.shared.text(key, args)
}

/// Translate a key that holds a LIST of strings (like the safety tips).
func tList(_ key: String) -> [String] {
    L10n.shared.list(key)
}

/// "2026-10-15T09:45:00+08:00" → "9:45 AM", in the app's language.
func formatTime(_ date: Date) -> String {
    let f = DateFormatter()
    f.locale = L10n.shared.language.locale
    f.timeStyle = .short
    f.dateStyle = .none
    return f.string(from: date)
}
