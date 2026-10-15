// WeatherService.swift — gets live weather from data.gov.sg and works out the heat risk.
//
// We use three FREE government APIs (no API key needed):
//   1. Air temperature   https://api-open.data.gov.sg/v2/real-time/api/air-temperature
//   2. Relative humidity https://api-open.data.gov.sg/v2/real-time/api/relative-humidity
//   3. WBGT heat stress  https://api-open.data.gov.sg/v2/real-time/api/weather?api=wbgt
//
// WBGT ("Wet Bulb Globe Temperature") is what NEA uses for heat-stress advisories.
// NEA's levels are: Low below 31°C · Moderate 31 to below 33°C · High 33°C and above.
// If WBGT is missing, we fall back to a "heat index" worked out from temperature + humidity.

import Foundation

enum RiskLevel: String, Codable, CaseIterable {
    case low, moderate, high

    var label: String { t("risk.\(rawValue)") }
}

struct HeatReading {
    enum Source { case wbgt, heatIndex } // which measurement decided the risk

    var risk: RiskLevel
    var source: Source
    var temperature: Double? // °C
    var humidity: Double? // %
    var wbgt: Double? // °C
    var heatIndex: Double? // °C, "feels like"
    var stationName: String? // nearest weather station
    var observedAt: Date
    var fromCache: Bool // true = offline, showing saved data
}

// MARK: - Shapes of the real API responses

/// Air temperature and humidity share this shape.
nonisolated struct StationAPI: Codable {
    struct Station: Codable {
        struct Location: Codable { let latitude: Double; let longitude: Double }
        let id: String
        let name: String
        let location: Location
    }

    struct Reading: Codable {
        struct Value: Codable { let stationId: String; let value: Double }
        let timestamp: String
        let data: [Value]
    }

    struct Body: Codable { let stations: [Station]; let readings: [Reading] }
    let code: Int
    let data: Body
}

/// WBGT has a different shape. Note: numbers come back as STRINGS here.
nonisolated struct WbgtAPI: Codable {
    struct Reading: Codable {
        struct Station: Codable { let id: String; let name: String; let townCenter: String? }
        struct Location: Codable { let latitude: String; let longitude: String }
        let station: Station
        let location: Location
        let wbgt: String
        let heatStress: String
    }

    struct Item: Codable { let readings: [Reading] }
    struct Record: Codable { let datetime: String; let item: Item }
    struct Body: Codable { let records: [Record] }
    let code: Int
    let data: Body
}

private nonisolated struct RawWeather: Codable {
    var temperature: StationAPI?
    var humidity: StationAPI?
    var wbgt: WbgtAPI?
    var savedAt: Date
}

enum WeatherService {
    private static let base = "https://api-open.data.gov.sg/v2/real-time/api"
    private static let cacheKey = "cooldrift.weatherCache"

    /// Gets the current heat risk for a location.
    /// 1. Try the internet → save a copy for later.
    /// 2. If offline or the API fails → use the saved copy.
    /// 3. If there's no saved copy either → throw (the screen shows a message).
    static func reading(at here: LatLng) async throws -> HeatReading {
        do {
            let raw = try await downloadAll()
            UserDefaults.standard.set(try JSONEncoder().encode(raw), forKey: cacheKey)
            return build(raw, here: here, fromCache: false)
        } catch {
            if let saved = UserDefaults.standard.data(forKey: cacheKey),
               let raw = try? JSONDecoder().decode(RawWeather.self, from: saved) {
                return build(raw, here: here, fromCache: true)
            }
            throw error
        }
    }

    // MARK: Downloading

    nonisolated private static func fetch<T: Decodable>(_ type: T.Type, _ url: String) async -> T? {
        guard let url = URL(string: url) else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 10 // so a bad connection doesn't hang the app
        // data.gov.sg turns away too many requests at once ("429"), so wait a moment and try again.
        for attempt in 1...4 {
            guard let (data, response) = try? await URLSession.shared.data(for: request) else { return nil }
            let status = (response as? HTTPURLResponse)?.statusCode
            if status == 200 { return try? JSONDecoder().decode(T.self, from: data) }
            if status != 429 { return nil }
            try? await Task.sleep(for: .seconds(1.5 * Double(attempt)))
        }
        return nil
    }

    /// Downloads all three datasets. Any one of them may fail — that's OK.
    private static func downloadAll() async throws -> RawWeather {
        // One after another: data.gov.sg turns away requests that arrive too fast.
        let t = await fetch(StationAPI.self, "\(base)/air-temperature")
        let h = await fetch(StationAPI.self, "\(base)/relative-humidity")
        let w = await fetch(WbgtAPI.self, "\(base)/weather?api=wbgt")
        let raw = RawWeather(temperature: t, humidity: h, wbgt: w, savedAt: .now)
        if raw.temperature == nil, raw.humidity == nil, raw.wbgt == nil { throw URLError(.cannotLoadFromNetwork) }
        return raw
    }

    // MARK: Picking the nearest station

    private static func nearestStation(_ api: StationAPI?, _ here: LatLng) -> (value: Double, name: String, time: String)? {
        guard let api, api.code == 0, let latest = api.data.readings.first else { return nil }
        var best: (value: Double, name: String, time: String, dist: Double)?
        for r in latest.data {
            guard let s = api.data.stations.first(where: { $0.id == r.stationId }) else { continue }
            let dist = Geo.distance(here, LatLng(latitude: s.location.latitude, longitude: s.location.longitude))
            if best == nil || dist < best!.dist { best = (r.value, s.name, latest.timestamp, dist) }
        }
        return best.map { ($0.value, $0.name, $0.time) }
    }

    private static func nearestWbgt(_ api: WbgtAPI?, _ here: LatLng) -> (wbgt: Double, name: String, time: String)? {
        guard let api, api.code == 0, let record = api.data.records.first else { return nil }
        var best: (wbgt: Double, name: String, dist: Double)?
        for r in record.item.readings {
            guard let lat = Double(r.location.latitude), let lng = Double(r.location.longitude),
                  let wbgt = Double(r.wbgt) else { continue }
            let dist = Geo.distance(here, LatLng(latitude: lat, longitude: lng))
            if best == nil || dist < best!.dist { best = (wbgt, r.station.townCenter ?? r.station.name, dist) }
        }
        return best.map { ($0.wbgt, $0.name, record.datetime) }
    }

    // MARK: Turning numbers into a risk level

    /// NEA WBGT levels → our risk level.
    static func risk(wbgt: Double) -> RiskLevel {
        wbgt >= 33 ? .high : wbgt >= 31 ? .moderate : .low
    }

    /// Heat index ("feels like" temperature) in °C, from the US weather service formula.
    /// Only used when WBGT is not available.
    static func heatIndex(tempC: Double, humidity r: Double) -> Double {
        let t = tempC * 9 / 5 + 32 // the formula works in °F
        var hi = 0.5 * (t + 61 + (t - 68) * 1.2 + r * 0.094) // simple version
        if (hi + t) / 2 >= 80 { // full version for hot weather
            hi = -42.379 + 2.04901523 * t + 10.14333127 * r - 0.22475541 * t * r - 0.00683783 * t * t
                - 0.05481717 * r * r + 0.00122874 * t * t * r + 0.00085282 * t * r * r - 0.00000199 * t * t * r * r
        }
        return (hi - 32) * 5 / 9
    }

    /// Heat index → risk level. (41°C+ is the US "Danger" level.)
    static func risk(heatIndex hi: Double) -> RiskLevel {
        hi >= 41 ? .high : hi >= 33 ? .moderate : .low
    }

    private static func date(_ iso: String?) -> Date? {
        guard let iso else { return nil }
        let f = ISO8601DateFormatter()
        if let d = f.date(from: iso) { return d }
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: iso)
    }

    /// Combines the raw API data into one simple HeatReading for this location.
    private static func build(_ raw: RawWeather, here: LatLng, fromCache: Bool) -> HeatReading {
        let temp = nearestStation(raw.temperature, here)
        let hum = nearestStation(raw.humidity, here)
        let w = nearestWbgt(raw.wbgt, here)
        let hi: Double? = if let temp, let hum { (heatIndex(tempC: temp.value, humidity: hum.value) * 10).rounded() / 10 } else { nil }

        var reading = HeatReading(
            risk: .low, source: .heatIndex, temperature: temp?.value, humidity: hum?.value,
            heatIndex: hi, observedAt: raw.savedAt, fromCache: fromCache
        )

        if let w { // prefer the official WBGT measurement
            reading.risk = risk(wbgt: w.wbgt)
            reading.source = .wbgt
            reading.wbgt = w.wbgt
            reading.stationName = w.name
            reading.observedAt = date(w.time) ?? raw.savedAt
        } else if let hi, let temp {
            reading.risk = risk(heatIndex: hi)
            reading.stationName = temp.name
            reading.observedAt = date(temp.time) ?? raw.savedAt
        } else { // only temperature: 35°C+ is high, 32°C+ is moderate
            let tc = temp?.value ?? 30
            reading.risk = tc >= 35 ? .high : tc >= 32 ? .moderate : .low
            reading.stationName = temp?.name
            reading.observedAt = date(temp?.time) ?? raw.savedAt
        }
        return reading
    }
}
