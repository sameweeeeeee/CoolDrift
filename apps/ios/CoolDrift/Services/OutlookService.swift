// OutlookService.swift — "Today" on the Home screen: the best time to go out,
// today's temperature range and rain, the UV index and haze (PSI).
// All from free NEA APIs on data.gov.sg (no key needed):
//   24-hour forecast  /v2/real-time/api/twenty-four-hr-forecast
//   2-hour forecast   /v2/real-time/api/two-hr-forecast   (per town)
//   UV index          /v2/real-time/api/uv                (hourly)
//   PSI               /v2/real-time/api/psi               (per region)
//
// NEA has no hour-by-hour temperature forecast, so "best time" uses Singapore's
// daily pattern (hottest 11am–4pm, as NEA advises) plus today's forecast.

import Foundation

struct Outlook {
    var low: Int?, high: Int? // today's temperature range, °C
    var rainLater = false // showers/thunderstorms in a coming forecast period
    var area: String? // nearest town for the 2-hour forecast
    var nearbyText: String? // e.g. "Thundery Showers" (NEA's English text)
    var uv: Int?
    var psi: Int?
    var psiRegion: String?

    enum TimeOfDay { case morning, midday, evening }

    /// Which part of the day it is now, for the "best time to go out" advice.
    static func timeOfDay(_ date: Date = .now) -> TimeOfDay {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Asia/Singapore")!
        let hour = cal.component(.hour, from: date)
        if hour >= 6 && hour < 10 { return .morning }
        if hour >= 10 && hour < 17 { return .midday }
        return .evening
    }

    var bestTimeText: String {
        switch Self.timeOfDay() {
        case .morning: t("outlook.morning")
        case .midday: t("outlook.midday")
        case .evening: t("outlook.evening")
        }
    }

    /// NEA UV levels: 0–2 low, 3–5 moderate, 6–7 high, 8–10 very high, 11+ extreme.
    var uvLevel: (key: String, danger: Int)? {
        guard let uv else { return nil }
        switch uv {
        case ..<3: return ("low", 0)
        case ..<6: return ("moderate", 1)
        case ..<8: return ("high", 2)
        case ..<11: return ("veryHigh", 3)
        default: return ("extreme", 3)
        }
    }

    /// NEA PSI bands: 0–50 good, 51–100 moderate, 101–200 unhealthy, 201–300 very unhealthy, 300+ hazardous.
    var psiLevel: (key: String, danger: Int)? {
        guard let psi else { return nil }
        switch psi {
        case ...50: return ("good", 0)
        case ...100: return ("moderate", 1)
        case ...200: return ("unhealthy", 2)
        case ...300: return ("veryUnhealthy", 3)
        default: return ("hazardous", 3)
        }
    }
}

enum OutlookService {
    nonisolated private static let base = "https://api-open.data.gov.sg/v2/real-time/api"

    private nonisolated static func download(_ path: String) async -> Data? {
        guard let url = URL(string: "\(base)/\(path)") else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 10
        // data.gov.sg turns away too many requests at once ("429"), so wait a moment and try again.
        for attempt in 1...4 {
            guard let (data, response) = try? await URLSession.shared.data(for: request) else { return nil }
            if (response as? HTTPURLResponse)?.statusCode != 429 { return data }
            try? await Task.sleep(for: .seconds(1.5 * Double(attempt)))
        }
        return nil
    }

    /// The "data" part of an API reply, if the reply says it worked.
    private static func json(_ data: Data?) -> [String: Any]? {
        guard let data,
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              obj["code"] as? Int == 0
        else { return nil }
        return obj["data"] as? [String: Any]
    }

    /// Gets everything at once. Anything that fails is just left out.
    static func today(at here: LatLng) async -> Outlook {
        // One after another: data.gov.sg turns away requests that arrive too fast.
        let day = json(await download("twenty-four-hr-forecast"))
        let twoHour = json(await download("two-hr-forecast"))
        let uv = json(await download("uv"))
        let psiJSON = json(await download("psi"))
        var o = Outlook()

        // Today's range, and whether rain is coming in a later period.
        if let record = (day?["records"] as? [[String: Any]])?.first {
            let temp = (record["general"] as? [String: Any])?["temperature"] as? [String: Any]
            o.low = temp?["low"] as? Int
            o.high = temp?["high"] as? Int
            let periods = record["periods"] as? [[String: Any]] ?? []
            o.rainLater = periods.contains { period in
                let regions = period["regions"] as? [String: [String: Any]] ?? [:]
                return regions.values.contains { ($0["text"] as? String ?? "").localizedCaseInsensitiveContains("shower") }
            }
        }

        // 2-hour forecast for the nearest town.
        if let d = twoHour,
           let areas = d["area_metadata"] as? [[String: Any]],
           let item = (d["items"] as? [[String: Any]])?.first,
           let forecasts = item["forecasts"] as? [[String: Any]] {
            let nearest = areas.min { distance(here, $0["label_location"]) < distance(here, $1["label_location"]) }
            if let name = nearest?["name"] as? String {
                o.area = name
                o.nearbyText = forecasts.first { $0["area"] as? String == name }?["forecast"] as? String
            }
        }

        // Latest hourly UV reading (the list is newest first).
        if let record = (uv?["records"] as? [[String: Any]])?.first,
           let latest = (record["index"] as? [[String: Any]])?.first {
            o.uv = latest["value"] as? Int
        }

        // 24-hour PSI for the nearest region.
        if let d = psiJSON,
           let regions = d["regionMetadata"] as? [[String: Any]],
           let item = (d["items"] as? [[String: Any]])?.first,
           let psi24 = (item["readings"] as? [String: Any])?["psi_twenty_four_hourly"] as? [String: Int] {
            let nearest = regions.min { distance(here, $0["labelLocation"]) < distance(here, $1["labelLocation"]) }
            if let name = nearest?["name"] as? String {
                o.psiRegion = name
                o.psi = psi24[name]
            }
        }
        return o
    }

    /// Distance to a {"latitude":…, "longitude":…} object from the API.
    private static func distance(_ here: LatLng, _ location: Any?) -> Double {
        guard let loc = location as? [String: Any],
              let lat = loc["latitude"] as? Double, let lng = loc["longitude"] as? Double
        else { return .infinity }
        return Geo.distance(here, LatLng(latitude: lat, longitude: lng))
    }
}
