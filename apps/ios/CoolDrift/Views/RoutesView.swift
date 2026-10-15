// RoutesView.swift — tap the map to choose a destination, get a "cool route", then Go.
//  • Green line = cool route (goes past cool spots, with rest stops)
//  • Grey dashed line = the normal fastest route, for comparison
//  • Go = turn-by-turn directions like Apple Maps: the next turn at the top,
//    read aloud, with the map following you.
// See RoutingService.swift for how the route is chosen.

import ActivityKit
import CoreLocation
import MapKit
import SwiftUI

struct RoutesView: View {
    @Environment(SettingsStore.self) private var settings
    @Environment(HeatStore.self) private var heat
    @Environment(AppRouter.self) private var router

    @State private var dest: AppRouter.Destination?
    @State private var mode = TravelMode.foot
    @State private var plan: CoolRoutePlan?
    @State private var pieces: [(shaded: Bool, points: [LatLng])] = [] // cool route cut into shade / sun
    @State private var loading = false
    @State private var camera = MapCameraPosition.automatic
    @State private var detent = PanelDetent.collapsed

    // Navigation (after tapping Go)
    @State private var navigating = false
    @State private var here: LatLng? // live position while navigating
    @State private var next = 1 // index of the upcoming turn in plan.cool.steps
    @State private var spokenStep = -1 // so each turn is read aloud only once
    @State private var activity: Activity<NavigationAttributes>? // Lock Screen + Dynamic Island
    @State private var backgroundSession: CLBackgroundActivitySession? // keeps location on while locked

    private var steps: [RouteStep] { plan?.cool.steps ?? [] }
    private var arrived: Bool { navigating && next >= steps.count }

    var body: some View {
        ZStack(alignment: .top) {
            map.ignoresSafeArea()
            if navigating {
                navigationBanner
                VStack { Spacer(); navigationBar }
            } else {
                panel
            }
        }
        .toolbar(navigating ? .hidden : .visible, for: .tabBar)
        .onChange(of: heat.location, initial: true) { _, here in
            if plan == nil { camera = Geo.camera(showing: [here]) }
        }
        // Another screen sent us here with a place ("Route" / "Show route"): plan straight away.
        .onChange(of: router.destination, initial: true) { _, sent in
            guard let sent else { return }
            endNavigation()
            dest = sent
            router.destination = nil
            Task { await findRoute() }
        }
        .task(id: navigating) {
            guard navigating else { return }
            // Live location while navigating. Each update moves us along the steps.
            do {
                for try await update in CLLocationUpdate.liveUpdates(.otherNavigation) {
                    guard let location = update.location else { continue }
                    here = LatLng(location.coordinate)
                    advance()
                }
            } catch {}
        }
    }

    // MARK: Map

    private var map: some View {
        MapReader { proxy in
            Map(position: $camera) {
                UserAnnotation()
                if let plan {
                    if !navigating {
                        MapPolyline(coordinates: plan.fastest.path.map(\.coordinate))
                            .stroke(Theme.fastRoute, style: StrokeStyle(lineWidth: 4, dash: [8, 8]))
                    }
                    // The cool route: green where it's in shade, orange where it's in the sun.
                    ForEach(pieces.indices, id: \.self) { i in
                        MapPolyline(coordinates: pieces[i].points.map(\.coordinate))
                            .stroke(pieces[i].shaded ? Theme.coolRoute : Theme.sunny,
                                    style: StrokeStyle(lineWidth: 8, lineCap: .round, lineJoin: .round))
                    }
                    ForEach(plan.restStops) { s in
                        Marker("\(t("routes.restStop")): \(s.name)", systemImage: "leaf.fill", coordinate: s.location.coordinate)
                            .tint(Theme.restStop)
                    }
                }
                if let dest {
                    Marker(dest.name, systemImage: "mappin", coordinate: dest.coords.coordinate).tint(.red)
                }
            }
            .mapControlVisibility(.hidden) // the top corner belongs to the ⚙️ button
            .onTapGesture { point in
                guard !navigating, let coordinate = proxy.convert(point, from: .local) else { return }
                dest = AppRouter.Destination(coords: LatLng(coordinate), name: t("routes.pinned"))
                plan = nil
                withAnimation(.snappy) { detent = .collapsed }
            }
        }
    }

    // MARK: Panel (before Go)

    private var panel: some View {
        DraggablePanel(detent: $detent, collapsedHeight: dest == nil ? 110 : 150) {
            header
        } content: {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if dest != nil, plan == nil { findButton }
                    if let plan { results(plan) }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let dest {
                HStack {
                    Text(t("routes.to", ["name": dest.name])).font(.title3.bold()).lineLimit(1)
                    Spacer()
                    Button {
                        withAnimation { self.dest = nil; plan = nil }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.subheadline.bold())
                            .foregroundStyle(Theme.textMuted)
                            .frame(width: 30, height: 30)
                            .background(.white.opacity(0.7), in: Circle())
                    }
                    .accessibilityLabel(t("routes.clear"))
                }
                Picker("", selection: $mode) {
                    ForEach(TravelMode.allCases, id: \.self) { m in
                        Label(m.label, systemImage: m.icon).tag(m)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: mode) {
                    if plan != nil { Task { await findRoute() } }
                }
            } else {
                Label(t("routes.tapDestination"), systemImage: "hand.tap.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 10)
    }

    private var findButton: some View {
        Button {
            Task { await findRoute() }
        } label: {
            HStack {
                if loading { ProgressView().tint(.white) }
                Text(loading ? t("routes.planning") : t("routes.find")).bold()
            }
            .frame(maxWidth: .infinity, minHeight: 50)
        }
        .buttonStyle(.borderedProminent)
        .buttonBorderShape(.capsule)
        .disabled(loading)
    }

    @ViewBuilder private func results(_ plan: CoolRoutePlan) -> some View {
        if heat.risk(demoHigh: settings.value.demoHigh) == .high {
            Label(t("routes.highWarning"), systemImage: "exclamationmark.triangle.fill")
                .font(.subheadline.bold())
                .foregroundStyle(Theme.risk(.high))
        }

        // Cool route: time, distance, and a big Go button, like Apple Maps.
        let extraMin = Int(((plan.cool.duration - plan.fastest.duration) / 60).rounded())
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(formatDuration(plan.cool.duration)).font(.title.bold())
                Text("\(formatDistance(plan.cool.distance)) · \(t(plan.restStops.count == 1 ? "routes.stopsOne" : "routes.stops", ["count": plan.restStops.count]))")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textMuted)
                Text([
                    t("routes.shade", ["pct": plan.shade]),
                    extraMin > 0 ? t("routes.extra", ["min": extraMin]) : nil,
                ].compactMap { $0 }.joined(separator: " · "))
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.coolRoute)
            }
            Spacer()
            Button(action: startNavigation) {
                Text(t("nav.go"))
                    .font(.title3.bold())
                    .foregroundStyle(.white)
                    .frame(width: 84, height: 56)
                    .background(Theme.primary, in: Capsule())
            }
            .buttonStyle(.plain)
        }

        Label("\(t("routes.fastest")): \(formatDuration(plan.fastest.duration)) · \(formatDistance(plan.fastest.distance)) · \(t("routes.shade", ["pct": plan.fastestShade]))", systemImage: "stopwatch")
            .font(.subheadline)
            .foregroundStyle(Theme.fastRoute)

        Text(t("routes.shadeLegend")).font(.footnote).foregroundStyle(Theme.textMuted)

        if plan.approximate {
            Text(t("routes.approximate")).font(.footnote).foregroundStyle(Theme.risk(.moderate))
        }

        // The full list of turns.
        Text(t("nav.directions")).font(.headline).padding(.top, 8)
        VStack(spacing: 0) {
            ForEach(Array(plan.cool.steps.enumerated()), id: \.element.id) { i, step in
                if i > 0 { Divider().padding(.leading, 52) }
                stepRow(step)
            }
        }
    }

    private func stepRow(_ step: RouteStep) -> some View {
        HStack(spacing: 14) {
            Image(systemName: step.icon)
                .font(.title3.weight(.semibold))
                .foregroundStyle(stepColor(step))
                .frame(width: 38, height: 38)
            VStack(alignment: .leading, spacing: 2) {
                Text(step.instruction(destination: dest?.name ?? "")).font(.body.weight(.medium))
                if step.distance > 0 {
                    Text(formatDistance(step.distance)).font(.subheadline).foregroundStyle(Theme.textMuted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 10)
    }

    private func stepColor(_ step: RouteStep) -> Color {
        switch step.kind {
        case .rest: Theme.restStop
        case .arrive: .red
        default: Theme.text
        }
    }

    // MARK: Navigation (after Go)

    /// The dark banner at the top: the next turn, how far away it is, and the one after.
    private var navigationBanner: some View {
        VStack(alignment: .leading, spacing: 8) {
            if arrived {
                Label(t("nav.arrived"), systemImage: "mappin.circle.fill").font(.title2.bold())
            } else if steps.indices.contains(next) {
                let step = steps[next]
                HStack(alignment: .center, spacing: 14) {
                    Image(systemName: step.icon).font(.system(size: 40, weight: .bold)).frame(width: 52)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(formatDistance(distanceToNext)).font(.title.bold())
                        Text(step.instruction(destination: dest?.name ?? "")).font(.title3.weight(.semibold))
                            .lineLimit(2)
                    }
                }
                if steps.indices.contains(next + 1) {
                    Label("\(t("nav.then")) · \(steps[next + 1].instruction(destination: dest?.name ?? ""))", systemImage: steps[next + 1].icon)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.white.opacity(0.15), in: Capsule())
                }
            }
        }
        .foregroundStyle(.white)
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.primaryDark, in: RoundedRectangle(cornerRadius: 28))
        .padding(.horizontal, 10)
        .padding(.top, 4)
        .accessibilityElement(children: .combine)
    }

    /// The glass bar at the bottom: arrival time, time and distance left, End.
    private var navigationBar: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(formatTime(.now.addingTimeInterval(remainingSeconds))).font(.title2.bold())
                Text("\(formatDuration(remainingSeconds)) · \(formatDistance(remainingMetres))")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textMuted)
            }
            Spacer()
            Button(action: endNavigation) {
                Text(t("nav.end"))
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(width: 84, height: 50)
                    .background(Theme.risk(.high), in: Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.leading, 22)
        .padding(.trailing, 10)
        .padding(.vertical, 10)
        .glassBackground(in: Capsule())
        .padding(.horizontal, 12)
        .padding(.bottom, 8)
    }

    private var distanceToNext: Double {
        guard let here, steps.indices.contains(next) else { return 0 }
        return Geo.distance(here, steps[next].location)
    }

    private var remainingMetres: Double {
        guard steps.indices.contains(next) else { return 0 }
        return distanceToNext + steps[next...].reduce(0) { $0 + $1.distance }
    }

    private var remainingSeconds: Double {
        guard let plan, plan.cool.distance > 0 else { return 0 }
        return plan.cool.duration * remainingMetres / plan.cool.distance
    }

    private func startNavigation() {
        guard !steps.isEmpty else { return }
        here = heat.location
        next = min(1, steps.count - 1)
        spokenStep = -1
        withAnimation { navigating = true }
        follow()
        say(steps[0].instruction(destination: dest?.name ?? ""))
        backgroundSession = CLBackgroundActivitySession()
        startLiveActivity()
    }

    private func endNavigation() {
        guard navigating else { return }
        withAnimation { navigating = false }
        if let plan { camera = Geo.camera(showing: plan.cool.path) }
        backgroundSession?.invalidate()
        backgroundSession = nil
        let ending = activity
        activity = nil
        Task { await ending?.end(nil, dismissalPolicy: .immediate) }
    }

    // MARK: Live Activity

    /// What the Lock Screen / Dynamic Island should show right now.
    private var liveState: NavigationAttributes.ContentState {
        let step = steps.indices.contains(next) ? steps[next] : nil
        return .init(
            icon: arrived ? "mappin.circle.fill" : step?.icon ?? "arrow.up",
            instruction: arrived ? t("nav.arrived") : step?.instruction(destination: dest?.name ?? "") ?? "",
            distance: formatDistance(distanceToNext),
            arrival: Date(timeIntervalSinceReferenceDate: ((Date.now.timeIntervalSinceReferenceDate + remainingSeconds) / 60).rounded() * 60),
            remaining: "\(formatDuration(remainingSeconds)) · \(formatDistance(remainingMetres))",
            arrived: arrived
        )
    }

    private func startLiveActivity() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let attributes = NavigationAttributes(destination: dest?.name ?? "", arrivalLabel: t("nav.arrive"))
        activity = try? Activity.request(attributes: attributes, content: .init(state: liveState, staleDate: nil))
    }

    /// Only sends an update when something visible changed (iOS limits how often apps can update).
    private func updateLiveActivity() {
        guard let activity else { return }
        let state = liveState
        guard state != activity.content.state else { return }
        Task { await activity.update(.init(state: state, staleDate: nil)) }
    }

    /// Like Apple Maps: close up, tilted, and turned to face the next turn.
    private func follow() {
        guard let here else { return }
        let target = steps.indices.contains(next) ? steps[next].location : dest?.coords ?? here
        withAnimation(.easeInOut(duration: 0.8)) {
            camera = .camera(MapCamera(centerCoordinate: here.coordinate, distance: 450, heading: Geo.bearing(here, target), pitch: 55))
        }
    }

    /// Called on every location update: read the next turn aloud when it's close,
    /// and move on to the following turn once we've reached it.
    private func advance() {
        defer {
            follow()
            updateLiveActivity()
        }
        guard steps.indices.contains(next) else { return }
        if distanceToNext < 60, spokenStep != next {
            spokenStep = next
            say(steps[next].instruction(destination: dest?.name ?? ""))
        }
        if distanceToNext < 20 {
            next += 1
            if arrived { say(t("nav.arrived")) }
        }
    }

    private func say(_ text: String) {
        Speech.speak(text, language: settings.value.language)
    }

    /// Asks RoutingService for the routes, then zooms the map to show them.
    private func findRoute() async {
        guard let dest else { return }
        loading = true
        let result = await RoutingService.plan(from: heat.location, to: dest.coords, mode: mode)
        plan = result
        pieces = ShadeMap.pieces(result.cool.path)
        loading = false
        withAnimation(.snappy) {
            camera = Geo.camera(showing: [heat.location, dest.coords] + result.cool.path)
            detent = .half
        }
    }
}
