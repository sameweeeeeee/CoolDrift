// RoutingService.swift — plans a "cool route" from A to B.
//
// HOW IT WORKS (the trade-off we chose):
// We don't have a map of every shady walkway in Singapore, so we can't do true
// "shade-aware" routing. Instead:
//   1. Ask a FREE routing server (OSRM, run by the OpenStreetMap community at
//      routing.openstreetmap.de, no API key) for the normal fastest route.
//   2. Find cool spots that lie close to the straight line from A to B.
//   3. Ask OSRM again for a route that goes THROUGH those cool spots (rest stops).
//   4. If the cool route is much longer (over 50% extra), drop to fewer stops.
// If there is no internet, we draw straight lines and estimate the time ("approximate").

import Foundation

enum TravelMode: String, CaseIterable {
    case foot, bike

    var label: String { t(self == .foot ? "routes.walk" : "routes.cycle") }
    var icon: String { self == .foot ? "figure.walk" : "bicycle" }
    fileprivate var speed: Double { self == .foot ? 1.3 : 4.2 } // metres per second, for the offline estimate
}

struct Route {
    var path: [LatLng]
    var distance: Double // metres
    var duration: Double // seconds
    var steps: [RouteStep] = [] // turn-by-turn directions
}

struct CoolRoutePlan {
    var fastest: Route
    var cool: Route
    var restStops: [CoolSpot] // places to rest along the cool route
    var coolScore: Int // % of the cool route within 300 m of a cool spot
    var approximate: Bool // true = offline straight-line estimate
}

enum RoutingService {
    private static let nearRouteM = 300.0

    /// Asks OSRM for a route through the given points (in order), with turn-by-turn steps.
    /// `stops` are the cool spots between the start and the end (one per middle point).
    private static func osrm(_ points: [LatLng], _ mode: TravelMode, stops: [CoolSpot] = []) async throws -> Route {
        struct Response: Decodable {
            struct R: Decodable {
                struct Geometry: Decodable { let coordinates: [[Double]] }
                struct Leg: Decodable { let steps: [Step] }
                struct Step: Decodable {
                    struct Maneuver: Decodable { let type: String; let modifier: String?; let location: [Double] }
                    let maneuver: Maneuver
                    let name: String?
                    let distance: Double
                }
                let geometry: Geometry
                let distance: Double
                let duration: Double
                let legs: [Leg]?
            }
            let code: String
            let routes: [R]?
        }

        let profile = mode == .foot ? "routed-foot" : "routed-bike"
        // OSRM wants "longitude,latitude" pairs separated by ";"
        let coords = points.map { String(format: "%.6f,%.6f", $0.longitude, $0.latitude) }.joined(separator: ";")
        let url = URL(string: "https://routing.openstreetmap.de/\(profile)/route/v1/driving/\(coords)?overview=full&geometries=geojson&steps=true")!
        var request = URLRequest(url: url)
        request.timeoutInterval = 15

        let (data, _) = try await URLSession.shared.data(for: request)
        let res = try JSONDecoder().decode(Response.self, from: data)
        guard res.code == "Ok", let r = res.routes?.first else { throw URLError(.badServerResponse) }

        // Join the legs (start → stop 1 → stop 2 → end) into one list of steps.
        // Arriving at a middle point becomes a "Rest stop" step; leaving it again is skipped.
        var steps: [RouteStep] = []
        let legs = r.legs ?? []
        for (i, leg) in legs.enumerated() {
            for step in leg.steps {
                let m = step.maneuver
                let at = LatLng(latitude: m.location[1], longitude: m.location[0])
                if m.type == "depart", i > 0 { steps[steps.count - 1].distance += step.distance; continue }
                if m.type == "arrive", i < legs.count - 1, i < stops.count {
                    steps.append(RouteStep(kind: .rest(stops[i]), road: "", location: at, distance: 0))
                    continue
                }
                if let made = RouteStep.from(type: m.type, modifier: m.modifier, road: step.name ?? "", location: at, distance: step.distance) {
                    steps.append(made)
                } else if !steps.isEmpty {
                    steps[steps.count - 1].distance += step.distance // just a name change: keep going
                }
            }
        }

        return Route(
            path: r.geometry.coordinates.map { LatLng(latitude: $0[1], longitude: $0[0]) },
            distance: r.distance,
            duration: r.duration,
            steps: steps
        )
    }

    /// Offline backup: straight lines between the points.
    private static func straightLine(_ points: [LatLng], _ mode: TravelMode, stops: [CoolSpot] = []) -> Route {
        let legs = zip(points, points.dropFirst()).map { Geo.distance($0, $1) * 1.3 } // streets are ~30% longer
        let distance = legs.reduce(0, +)
        // Steps: start → each rest stop → arrive.
        var steps = [RouteStep(kind: .depart, road: "", location: points[0], distance: legs.first ?? 0)]
        for (i, stop) in stops.enumerated() where i + 1 < legs.count {
            steps.append(RouteStep(kind: .rest(stop), road: "", location: stop.location, distance: legs[i + 1]))
        }
        steps.append(RouteStep(kind: .arrive, road: "", location: points[points.count - 1], distance: 0))
        return Route(path: points, distance: distance, duration: distance / mode.speed, steps: steps)
    }

    /// Picks cool spots between A and B. Longer trips get more stops (about one every 1.5 km, max 3).
    private static func chooseStops(_ from: LatLng, _ to: LatLng) -> [CoolSpot] {
        let straight = Geo.distance(from, to)
        let corridor = max(400, straight * 0.2) // how far off the line we'll look
        let numStops = min(3, max(1, Int((straight / 1500).rounded())))

        let candidates = CoolSpots.all
            .map { (spot: $0, line: Geo.offsetFromLine($0.location, from, to)) }
            .filter { $0.line.t > 0.1 && $0.line.t < 0.9 && $0.line.offsetM <= corridor }

        // Split the trip into equal parts and pick the spot closest to the line in each part.
        return (0..<numStops).compactMap { i in
            let start = Double(i) / Double(numStops), end = Double(i + 1) / Double(numStops)
            return candidates
                .filter { $0.line.t >= start && $0.line.t < end }
                .min { $0.line.offsetM < $1.line.offsetM }?.spot
        }
    }

    /// What % of the path is within 300 m of a cool spot.
    private static func coolScore(_ path: [LatLng]) -> Int {
        guard !path.isEmpty else { return 0 }
        let near = path.filter { p in CoolSpots.all.contains { Geo.distance(p, $0.location) <= nearRouteM } }.count
        return Int((Double(near) / Double(path.count) * 100).rounded())
    }

    /// Plans both the fastest route and the cool route.
    static func plan(from: LatLng, to: LatLng, mode: TravelMode) async -> CoolRoutePlan {
        var stops = chooseStops(from, to)

        do {
            let fastest = try await osrm([from, to], mode)
            var cool = fastest

            // Try with all stops, then fewer, until the detour is acceptable (≤ 50% longer).
            while !stops.isEmpty {
                let attempt = try await osrm([from] + stops.map(\.location) + [to], mode, stops: stops)
                if attempt.distance <= fastest.distance * 1.5 {
                    cool = attempt
                    break
                }
                stops.removeLast()
            }

            // Also list other cool spots the route passes close to (not at the start or
            // the destination). Only the 4 closest, so the list stays short.
            let chosen = Set(stops.map(\.id))
            let passing = CoolSpots.all
                .filter { !chosen.contains($0.id) && Geo.distance($0.location, from) > 200 && Geo.distance($0.location, to) > 200 }
                .map { (spot: $0, away: Geo.distanceToPath($0.location, cool.path)) }
                .filter { $0.away <= 150 }
                .sorted { $0.away < $1.away }
                .prefix(4)
                .map(\.spot)

            return CoolRoutePlan(fastest: fastest, cool: cool, restStops: stops + passing, coolScore: coolScore(cool.path), approximate: false)
        } catch {
            // Offline or routing server problem → straight-line estimate.
            let fastest = straightLine([from, to], mode)
            let cool = straightLine([from] + stops.map(\.location) + [to], mode, stops: stops)
            return CoolRoutePlan(fastest: fastest, cool: cool, restStops: stops, coolScore: coolScore(cool.path), approximate: true)
        }
    }
}
