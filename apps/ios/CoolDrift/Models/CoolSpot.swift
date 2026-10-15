// CoolSpot.swift — the list of cool places, sorted by distance.
// The data lives in Resources/coolSpots.json (copied from the Expo app's src/data).
// Community clubs, hawker centres and parks are real data from data.gov.sg.
//
// Every spot has a COOLING TYPE, so users can pick what suits them:
//   aircon — air-conditioned indoors (community clubs, libraries, malls)
//   shaded — roofed or sheltered (hawker centres, covered water points)
//   green  — parks with trees and shelters (natural cooling, no air-con used)

import Foundation

enum SpotType: String, Codable, CaseIterable {
    case communityCentre = "community_centre"
    case library, mall, hawker, park
    case waterPoint = "water_point"

    var label: String { t("spots.types.\(rawValue)") }

    var icon: String {
        switch self {
        case .communityCentre: "person.3.fill"
        case .library: "books.vertical.fill"
        case .mall: "bag.fill"
        case .hawker: "fork.knife"
        case .park: "leaf.fill"
        case .waterPoint: "drop.fill"
        }
    }
}

enum CoolingType: String, Codable, CaseIterable {
    case aircon, shaded, green

    var label: String { t("cooling.\(rawValue)") }

    var icon: String {
        switch self {
        case .aircon: "snowflake"
        case .shaded: "umbrella.fill"
        case .green: "leaf.fill"
        }
    }
}

struct CoolSpot: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let type: SpotType
    let cooling: CoolingType
    let latitude: Double
    let longitude: Double
    let note: String?

    var location: LatLng { LatLng(latitude: latitude, longitude: longitude) }
}

struct SpotDistance: Identifiable, Hashable {
    let spot: CoolSpot
    let distance: Double // metres
    var id: String { spot.id }
}

enum CoolSpots {
    /// Every cool spot bundled with the app (works offline).
    static let all: [CoolSpot] = {
        struct File: Decodable { let spots: [CoolSpot] }
        guard let url = Bundle.main.url(forResource: "coolSpots", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let file = try? JSONDecoder().decode(File.self, from: data)
        else { return [] }
        return file.spots
    }()

    /// Spots sorted from nearest to furthest away, optionally only one cooling type.
    static func byDistance(from here: LatLng, cooling: CoolingType? = nil) -> [SpotDistance] {
        all.filter { cooling == nil || $0.cooling == cooling }
            .map { SpotDistance(spot: $0, distance: Geo.distance(here, $0.location)) }
            .sorted { $0.distance < $1.distance }
    }

    /// The single nearest cool spot (optionally of one cooling type).
    static func nearest(to here: LatLng, cooling: CoolingType? = nil) -> SpotDistance? {
        byDistance(from: here, cooling: cooling).first
    }
}
