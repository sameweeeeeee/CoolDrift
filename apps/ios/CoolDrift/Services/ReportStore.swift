// ReportStore.swift — the crowdsourced "hot spot" reports.
// Right now every report is saved ON THIS PHONE ONLY (UserDefaults).
// To share reports between phones, add a real database in syncToBackend()
// and fetchShared() below. Only send the location and level — never who sent it.

import Foundation

enum HotLevel: Int, Codable, CaseIterable {
    case warm = 1, hot = 2, veryHot = 3

    var label: String { t("spots.level\(rawValue)") }
}

struct HotReport: Codable, Identifiable {
    let id: String
    let latitude: Double
    let longitude: Double
    let level: HotLevel
    let createdAt: Date

    var location: LatLng { LatLng(latitude: latitude, longitude: longitude) }
}

enum ReportStore {
    private static let key = "cooldrift.hotReports"
    private static let maxAge: TimeInterval = 24 * 60 * 60 // heat changes daily, so hide older reports

    private static func saved() -> [HotReport] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let all = try? JSONDecoder().decode([HotReport].self, from: data)
        else { return [] }
        return all.filter { Date.now.timeIntervalSince($0.createdAt) < maxAge }
    }

    /// Reports from the last 24 hours.
    static func load() -> [HotReport] {
        saved() + fetchShared()
    }

    /// Saves a new report and returns the updated list.
    static func add(at where_: LatLng, level: HotLevel) -> [HotReport] {
        let report = HotReport(
            id: UUID().uuidString, latitude: where_.latitude, longitude: where_.longitude,
            level: level, createdAt: .now
        )
        let updated = saved() + [report]
        UserDefaults.standard.set(try? JSONEncoder().encode(updated), forKey: key)
        syncToBackend(report)
        return updated
    }

    /// Deletes all reports saved on this phone.
    static func clear() {
        UserDefaults.standard.removeObject(forKey: key)
    }

    // Backend hook: does nothing yet, so the app works fully offline and no data leaves the phone.
    private static func syncToBackend(_ report: HotReport) {}
    private static func fetchShared() -> [HotReport] { [] }
}
