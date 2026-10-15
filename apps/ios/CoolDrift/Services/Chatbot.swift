// Chatbot.swift — a simple RULE-BASED chatbot (no AI, no internet, free).
//   1. Look for keywords in the question (English, Chinese, Malay or Tamil).
//   2. Pick the matching "intent" (what the user wants).
//   3. Build the answer from the LIVE heat data.
// To teach it something new: add an intent + keywords below, and an answer.

import Foundation

enum Chatbot {
    enum Intent { case emergency, safe, nearest, temp, water, route, tips, hello }

    // Keywords for each intent. Order matters: emergency is checked first.
    private static let keywords: [(Intent, [String])] = [
        (.emergency, ["dizzy", "faint", "unwell", "sick", "ambulance", "heatstroke", "头晕", "不舒服", "pening", "sakit", "தலைசுற்ற"]),
        (.nearest, ["nearest", "near", "where", "cool place", "rest", "shelter", "aircon", "最近", "哪里", "清凉", "terdekat", "mana", "அருகில்", "எங்கே"]),
        (.safe, ["safe", "go out", "outside", "walk", "exercise", "安全", "出门", "selamat", "keluar", "பாதுகாப்"]),
        (.temp, ["hot", "temperature", "weather", "humid", "degree", "多热", "温度", "天气", "panas", "suhu", "சூடு", "வெப்பநிலை"]),
        (.water, ["water", "drink", "thirsty", "喝水", "水", "air", "minum", "தண்ணீர்"]),
        (.route, ["route", "way", "go to", "get to", "directions", "路线", "怎么去", "laluan", "jalan", "வழி"]),
        (.tips, ["what should", "tip", "advice", "do", "怎么做", "建议", "nasihat", "buat", "என்ன செய்"]),
        (.hello, ["hi", "hello", "hey", "你好", "helo", "hai", "வணக்கம்"]),
    ]

    // Words that mean the user wants a certain KIND of cool place.
    private static let coolingWords: [(CoolingType, [String])] = [
        (.aircon, ["aircon", "air-con", "air con", "air conditioned", "air-conditioned", "indoor", "indoors", "冷气", "空调", "berhawa dingin", "ஏசி", "குளிரூட்ட"]),
        (.shaded, ["shade", "shaded", "shady", "roof", "covered", "hawker", "阴凉", "遮", "小贩", "teduh", "berteduh", "நிழல்"]),
        (.green, ["park", "parks", "green", "tree", "trees", "garden", "nature", "公园", "绿", "taman", "hijau", "பூங்கா", "பசுமை"]),
    ]

    /// English/Malay words must match as WHOLE words (so "hi" doesn't match "this").
    /// Chinese and Tamil don't put spaces between words, so we just search inside the text.
    private static func matches(_ text: String, _ word: String) -> Bool {
        if word.allSatisfy({ $0.isASCII && ($0.isLetter || $0 == " " || $0 == "-") }) {
            return text.range(of: "\\b\(NSRegularExpression.escapedPattern(for: word))\\b", options: .regularExpression) != nil
        }
        return text.contains(word)
    }

    static func intent(_ question: String) -> Intent? {
        let q = question.lowercased()
        if let hit = keywords.first(where: { $0.1.contains { matches(q, $0) } }) { return hit.0 }
        // "Any parks?" has no "nearest" word, but clearly asks for a place.
        return cooling(question) != nil ? .nearest : nil
    }

    static func cooling(_ question: String) -> CoolingType? {
        let q = question.lowercased()
        return coolingWords.first(where: { $0.1.contains { matches(q, $0) } })?.0
    }

    /// The bot's reply to a question.
    static func answer(_ question: String, reading: HeatReading?, risk: RiskLevel?, location: LatLng) -> String {
        switch intent(question) {
        case .emergency:
            return t("chat.a.emergency")
        case .safe:
            guard let risk else { return t("chat.a.noData") }
            return t("chat.a.safe_\(risk.rawValue)")
        case .nearest:
            // e.g. "nearest park?" → only look at green areas
            guard let near = CoolSpots.nearest(to: location, cooling: cooling(question)) else { return t("chat.a.unknown") }
            return t("chat.a.nearest", [
                "name": near.spot.name,
                "type": near.spot.type.label,
                "cooling": near.spot.cooling.label,
                "dist": formatDistance(near.distance),
                "note": near.spot.note ?? "",
            ])
        case .temp:
            guard let reading, let temp = reading.temperature else { return t("chat.a.noData") }
            return t("chat.a.temp", [
                "station": reading.stationName ?? "Singapore",
                "temp": temp.formatted(),
                "hum": reading.humidity?.formatted() ?? "?",
                "level": risk?.label ?? "?",
            ])
        case .water:
            return t("chat.a.water")
        case .route:
            return t("chat.a.route")
        case .tips:
            guard let risk else { return t("chat.a.noData") }
            let tips = tList("tips.\(risk.rawValue)")
            return "\(t("risk.title")): \(risk.label).\n• " + tips.joined(separator: "\n• ")
        case .hello:
            return t("chat.a.hello")
        case nil:
            return t("chat.a.unknown")
        }
    }
}
