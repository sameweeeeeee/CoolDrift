// LocationService.swift — asks for permission and reads the phone's position.
// PRIVACY: the location never leaves the phone. We only use it to pick the nearest
// weather station and sort cool spots. Start/end points go to the routing server
// only when you ask for a route (see RoutingService).

import CoreLocation

enum LocationStatus { case unknown, granted, denied, error }

final class LocationService: NSObject, CLLocationManagerDelegate {
    static let shared = LocationService()

    private let manager = CLLocationManager()
    private var authContinuation: CheckedContinuation<Void, Never>?
    private var locationContinuation: CheckedContinuation<CLLocation?, Never>?
    private static let lastKey = "cooldrift.lastLocation"

    override private init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    /// Gets the user's location. If permission is denied or GPS fails, we use the
    /// last known spot (or the centre of Singapore) so the app still works.
    func current() async -> (coords: LatLng, status: LocationStatus) {
        if manager.authorizationStatus == .notDetermined {
            await withCheckedContinuation { cont in
                authContinuation = cont
                manager.requestWhenInUseAuthorization()
            }
        }
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            break
        default:
            return (Self.lastKnown, .denied)
        }

        let location = await withCheckedContinuation { cont in
            locationContinuation = cont
            manager.requestLocation()
        }
        guard let location else { return (Self.lastKnown, .error) }
        let coords = LatLng(location.coordinate)
        UserDefaults.standard.set(try? JSONEncoder().encode(coords), forKey: Self.lastKey) // saved on this phone only
        return (coords, .granted)
    }

    /// The last location we saved on this phone (the background check uses this too).
    static var lastKnown: LatLng {
        guard let data = UserDefaults.standard.data(forKey: lastKey),
              let coords = try? JSONDecoder().decode(LatLng.self, from: data)
        else { return .singaporeCentre }
        return coords
    }

    // MARK: CLLocationManagerDelegate

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            guard manager.authorizationStatus != .notDetermined else { return }
            authContinuation?.resume()
            authContinuation = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let last = locations.last
        Task { @MainActor in
            locationContinuation?.resume(returning: last)
            locationContinuation = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            locationContinuation?.resume(returning: nil)
            locationContinuation = nil
        }
    }
}
