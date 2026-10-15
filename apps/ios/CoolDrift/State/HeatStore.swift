// HeatStore.swift — the "brain" every screen shares.
// It knows where the user is, the latest weather and the heat risk.
// RootView refreshes it every 15 minutes and whenever the app comes back to the front.

import Foundation
import Observation

@Observable
final class HeatStore {
    var location = LatLng.singaporeCentre
    var locationStatus = LocationStatus.unknown
    var reading: HeatReading?
    var loading = true
    var failed = false // true = no live data AND no saved data

    /// Get location → get weather → work out risk.
    func refresh() async {
        loading = true
        let loc = await LocationService.shared.current()
        location = loc.coords
        locationStatus = loc.status
        do {
            reading = try await WeatherService.reading(at: loc.coords)
            failed = false
        } catch {
            failed = true
        }
        loading = false
    }

    /// The risk to SHOW. Demo mode pretends it's High so you can show alerts to judges.
    func risk(demoHigh: Bool) -> RiskLevel? {
        demoHigh ? .high : reading?.risk
    }

    /// The sentence "Read aloud" speaks.
    func spokenSummary(_ risk: RiskLevel) -> String {
        var parts = [t("speech.summary", ["level": risk.label])] + tList("tips.\(risk.rawValue)")
        if let near = CoolSpots.nearest(to: location) {
            parts.append(t("speech.nearest", ["name": near.spot.name, "dist": formatDistance(near.distance)]))
        }
        return parts.joined(separator: " ")
    }
}

/// Which tab is open, and a place to route to (sent from Home or Cool Spots).
@Observable
final class AppRouter {
    enum TabID: Hashable { case home, spots, routes, chat, more }

    struct Destination: Equatable {
        let id = UUID() // a new id makes Routes plan again, even for the same place
        let coords: LatLng
        let name: String
    }

    var tab = TabID.home
    var destination: Destination?

    /// Opens the Routes tab and plans a cool route to this spot.
    func route(to spot: CoolSpot) {
        destination = Destination(coords: spot.location, name: spot.name)
        tab = .routes
    }
}
