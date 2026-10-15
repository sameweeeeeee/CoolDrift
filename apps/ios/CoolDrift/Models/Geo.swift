// Geo.swift — small maths helpers for working with map coordinates.

import CoreLocation
import MapKit
import SwiftUI

struct LatLng: Codable, Hashable {
    var latitude: Double
    var longitude: Double

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }

    init(_ c: CLLocationCoordinate2D) {
        self.init(latitude: c.latitude, longitude: c.longitude)
    }

    /// Centre of Singapore — used when we don't know where the user is.
    static let singaporeCentre = LatLng(latitude: 1.3521, longitude: 103.8198)
}

enum Geo {
    private static let earthRadiusM = 6_371_000.0
    private static func rad(_ deg: Double) -> Double { deg * .pi / 180 }

    /// Distance between two points in METRES, using the "haversine" formula
    /// (the distance along the curved surface of the Earth).
    static func distance(_ a: LatLng, _ b: LatLng) -> Double {
        let dLat = rad(b.latitude - a.latitude)
        let dLng = rad(b.longitude - a.longitude)
        let h = pow(sin(dLat / 2), 2) + cos(rad(a.latitude)) * cos(rad(b.latitude)) * pow(sin(dLng / 2), 2)
        return 2 * earthRadiusM * asin(sqrt(h))
    }

    /// How far point P is from the straight line A→B (in metres), and where along
    /// the line it sits (t = 0 at A, t = 1 at B).
    /// Singapore is small, so we can treat the map as flat here — it's accurate enough.
    static func offsetFromLine(_ p: LatLng, _ a: LatLng, _ b: LatLng) -> (offsetM: Double, t: Double) {
        let mPerDegLat = 111_320.0
        let mPerDegLng = 111_320.0 * cos(rad(a.latitude))
        let bx = (b.longitude - a.longitude) * mPerDegLng
        let by = (b.latitude - a.latitude) * mPerDegLat
        let px = (p.longitude - a.longitude) * mPerDegLng
        let py = (p.latitude - a.latitude) * mPerDegLat
        let lenSq = max(bx * bx + by * by, 1)
        let t = (px * bx + py * by) / lenSq
        let clamped = min(1, max(0, t))
        let dx = px - clamped * bx
        let dy = py - clamped * by
        return (sqrt(dx * dx + dy * dy), t)
    }

    /// Shortest distance from a point to any point on a path (checks every vertex).
    static func distanceToPath(_ p: LatLng, _ path: [LatLng]) -> Double {
        path.map { distance(p, $0) }.min() ?? .infinity
    }

    /// A map camera that shows all the points (or zooms in on just one).
    static func camera(showing points: [LatLng]) -> MapCameraPosition {
        guard let first = points.first else { return .automatic }
        if points.count == 1 {
            return .region(MKCoordinateRegion(center: first.coordinate, latitudinalMeters: 1300, longitudinalMeters: 1300))
        }
        let lats = points.map(\.latitude), lngs = points.map(\.longitude)
        let center = CLLocationCoordinate2D(
            latitude: (lats.min()! + lats.max()!) / 2,
            longitude: (lngs.min()! + lngs.max()!) / 2
        )
        let span = MKCoordinateSpan(
            latitudeDelta: max(0.005, (lats.max()! - lats.min()!) * 1.4),
            longitudeDelta: max(0.005, (lngs.max()! - lngs.min()!) * 1.4)
        )
        return .region(MKCoordinateRegion(center: center, span: span))
    }
}

/// Turns 850 into "850 m" and 2300 into "2.3 km".
func formatDistance(_ m: Double) -> String {
    m < 1000 ? "\(Int((m / 10).rounded()) * 10) m" : String(format: "%.1f km", m / 1000)
}

/// Turns seconds into "12 min" or "1 h 5 min".
func formatDuration(_ seconds: Double) -> String {
    let mins = max(1, Int((seconds / 60).rounded()))
    return mins < 60 ? "\(mins) min" : "\(mins / 60) h \(mins % 60) min"
}
