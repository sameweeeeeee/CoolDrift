// RoutesView.swift — tap the map to choose a destination, then get a "cool route".
//  • Green line = cool route (goes past cool spots, with rest stops)
//  • Grey dashed line = the normal fastest route, for comparison
// See RoutingService.swift for how the route is chosen.

import MapKit
import SwiftUI

struct RoutesView: View {
    @Environment(SettingsStore.self) private var settings
    @Environment(HeatStore.self) private var heat
    @Environment(AppRouter.self) private var router

    @State private var dest: AppRouter.Destination?
    @State private var mode = TravelMode.foot
    @State private var plan: CoolRoutePlan?
    @State private var loading = false
    @State private var camera = MapCameraPosition.automatic

    var body: some View {
        VStack(spacing: 0) {
            map
            panel
                .containerRelativeFrame(.vertical) { height, _ in height * 0.42 }
        }
        .background(Theme.background)
        .onChange(of: heat.location, initial: true) { _, here in
            if plan == nil { camera = Geo.camera(showing: [here]) }
        }
        // Another screen sent us here with a place ("Route" / "Show route"): plan straight away.
        .onChange(of: router.destination, initial: true) { _, sent in
            guard let sent else { return }
            dest = sent
            router.destination = nil
            Task { await findRoute() }
        }
    }

    // MARK: Map

    private var map: some View {
        MapReader { proxy in
            Map(position: $camera) {
                UserAnnotation()
                if let plan {
                    MapPolyline(coordinates: plan.fastest.path.map(\.coordinate))
                        .stroke(Theme.fastRoute, style: StrokeStyle(lineWidth: 4, dash: [8, 8]))
                    MapPolyline(coordinates: plan.cool.path.map(\.coordinate))
                        .stroke(Theme.coolRoute, lineWidth: 7)
                    ForEach(plan.restStops) { s in
                        Marker("\(t("routes.restStop")): \(s.name)", systemImage: "leaf.fill", coordinate: s.location.coordinate)
                            .tint(Theme.restStop)
                    }
                }
                if let dest {
                    Marker(dest.name, coordinate: dest.coords.coordinate).tint(.red)
                }
            }
            .mapControls { MapUserLocationButton() }
            .onTapGesture { point in
                guard let coordinate = proxy.convert(point, from: .local) else { return }
                dest = AppRouter.Destination(coords: LatLng(coordinate), name: t("routes.pinned"))
                plan = nil
            }
        }
        .overlay(alignment: .top) {
            if dest == nil {
                Label(t("routes.tapDestination"), systemImage: "hand.tap.fill")
                    .font(.headline)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
                    .padding(12)
                    .allowsHitTesting(false)
            }
        }
    }

    // MARK: Panel

    private var panel: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let dest {
                    Text(t("routes.to", ["name": dest.name])).font(.title3.bold()).lineLimit(1)
                }

                Picker("", selection: $mode) {
                    ForEach(TravelMode.allCases, id: \.self) { m in
                        Label(m.label, systemImage: m.icon).tag(m)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: mode) {
                    if dest != nil, plan != nil { Task { await findRoute() } }
                }

                if dest != nil, plan == nil {
                    Button {
                        Task { await findRoute() }
                    } label: {
                        HStack {
                            if loading { ProgressView().tint(.white) }
                            Text(loading ? t("routes.planning") : t("routes.find")).bold()
                        }
                        .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(loading)
                }

                if let plan { results(plan) }
            }
            .padding(16)
        }
    }

    @ViewBuilder private func results(_ plan: CoolRoutePlan) -> some View {
        if heat.risk(demoHigh: settings.value.demoHigh) == .high {
            Label(t("routes.highWarning"), systemImage: "exclamationmark.triangle.fill")
                .font(.subheadline.bold())
                .foregroundStyle(Theme.risk(.high))
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.risk(.high), lineWidth: 2))
        }

        // Cool route summary
        let extraMin = Int(((plan.cool.duration - plan.fastest.duration) / 60).rounded())
        VStack(alignment: .leading, spacing: 4) {
            Label(t("routes.cool"), systemImage: "leaf.fill").bold().foregroundStyle(Theme.coolRoute)
            Text("\(formatDuration(plan.cool.duration)) · \(formatDistance(plan.cool.distance))").font(.title2.bold())
            Text([
                t("routes.stops", ["count": plan.restStops.count]),
                t("routes.nearCool", ["pct": plan.coolScore]),
                extraMin > 0 ? t("routes.extra", ["min": extraMin]) : nil,
            ].compactMap { $0 }.joined(separator: " · "))
                .font(.subheadline)
            ForEach(plan.restStops) { s in
                Text("• \(s.name)").font(.subheadline).foregroundStyle(Theme.textMuted)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.coolRoute, lineWidth: 2))

        // Fastest route, for comparison
        Label("\(t("routes.fastest")): \(formatDuration(plan.fastest.duration)) · \(formatDistance(plan.fastest.distance))", systemImage: "stopwatch")
            .bold()
            .foregroundStyle(Theme.fastRoute)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.fastRoute, lineWidth: 2))

        if plan.approximate {
            Text(t("routes.approximate")).font(.footnote).foregroundStyle(Theme.risk(.moderate))
        }

        Button(t("routes.clear")) {
            self.plan = nil
            dest = nil
        }
        .buttonStyle(.bordered)
        .frame(maxWidth: .infinity)
    }

    /// Asks RoutingService for the routes, then zooms the map to show them.
    private func findRoute() async {
        guard let dest else { return }
        loading = true
        let result = await RoutingService.plan(from: heat.location, to: dest.coords, mode: mode)
        plan = result
        loading = false
        withAnimation { camera = Geo.camera(showing: [heat.location, dest.coords] + result.cool.path) }
    }
}
