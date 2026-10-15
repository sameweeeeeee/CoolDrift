// SpotsView.swift — map + list of cool places, and the crowdsourced heat map.
//  • Pins = cool places (blue = air-con, brown = shaded, green = green area)
//  • Coloured circles = hot spots reported by users (yellow → orange → red)
//  • "Report hot spot" lets you add your own report.

import MapKit
import SwiftUI

struct SpotsView: View {
    @Environment(HeatStore.self) private var heat
    @Environment(AppRouter.self) private var router

    // Steps of reporting: not reporting → choosing a place → choosing how hot
    private enum ReportStep: Equatable { case none, pick, level(LatLng) }

    @State private var filter: SpotType?
    @State private var reports: [HotReport] = []
    @State private var showHeat = true
    @State private var step = ReportStep.none
    @State private var message: String?
    @State private var camera = MapCameraPosition.automatic

    private static let mapPinLimit = 80 // only the nearest go on the map, so it stays smooth

    private var spots: [SpotDistance] {
        CoolSpots.byDistance(from: heat.location).filter { filter == nil || $0.spot.type == filter }
    }

    private var pendingReport: LatLng? {
        if case .level(let where_) = step { return where_ }
        return nil
    }

    var body: some View {
        VStack(spacing: 0) {
            map
                .containerRelativeFrame(.vertical) { height, _ in height * 0.45 }
            switch step {
            case .none: list
            case .pick: pickPanel
            case .level(let where_): levelPanel(where_)
            }
        }
        .background(Theme.background)
        .onAppear { reports = ReportStore.load() }
        .onChange(of: heat.location, initial: true) { _, here in
            // Show the user together with the 3 nearest cool spots.
            let nearby = CoolSpots.byDistance(from: here).prefix(3).map(\.spot.location)
            camera = Geo.camera(showing: [here] + nearby)
        }
    }

    // MARK: Map

    private var map: some View {
        MapReader { proxy in
            Map(position: $camera) {
                UserAnnotation()
                ForEach(Array(spots.prefix(Self.mapPinLimit))) { s in
                    Marker(s.spot.name, systemImage: s.spot.type.icon, coordinate: s.spot.location.coordinate)
                        .tint(Theme.cooling(s.spot.cooling))
                }
                if showHeat {
                    // Two circles per report: a soft outer glow and a stronger centre.
                    ForEach(reports) { r in
                        MapCircle(center: r.location.coordinate, radius: 120 + Double(r.level.rawValue) * 60)
                            .foregroundStyle(Theme.heat(r.level).opacity(0.35))
                        MapCircle(center: r.location.coordinate, radius: 50 + Double(r.level.rawValue) * 20)
                            .foregroundStyle(Theme.heat(r.level).opacity(0.45))
                    }
                }
                if let pendingReport {
                    Marker(t("spots.report"), systemImage: "flame.fill", coordinate: pendingReport.coordinate)
                        .tint(.red)
                }
            }
            .mapControls { MapUserLocationButton() }
            .onTapGesture { point in
                guard step == .pick, let coordinate = proxy.convert(point, from: .local) else { return }
                step = .level(LatLng(coordinate))
            }
        }
        .overlay(alignment: .topLeading) {
            if step == .none {
                HStack {
                    Button {
                        step = .pick
                    } label: {
                        Label(t("spots.report"), systemImage: "flame.fill")
                    }
                    .tint(Theme.risk(.high))
                    .glassButton(prominent: true)

                    Button {
                        showHeat.toggle()
                    } label: {
                        Label(t("spots.showReports"), systemImage: showHeat ? "eye" : "eye.slash")
                    }
                    .glassButton()
                }
                .font(.subheadline.bold())
                .padding(10)
            }
        }
        .overlay(alignment: .bottom) {
            if let message {
                Text(message)
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.primaryDark, in: Capsule())
                    .padding(12)
                    .transition(.opacity)
            }
        }
    }

    // MARK: List

    private var list: some View {
        List {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    chip(t("spots.all"), selected: filter == nil) { filter = nil }
                    ForEach(SpotType.allCases, id: \.self) { type in
                        chip(type.label, selected: filter == type) { filter = type }
                    }
                }
            }
            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
            .listRowBackground(Color.clear)

            if showHeat && !reports.isEmpty {
                Text(t("spots.legend")).font(.footnote).foregroundStyle(Theme.textMuted)
                    .listRowBackground(Color.clear)
            }

            ForEach(spots) { s in
                HStack(spacing: 12) {
                    CoolingIcon(cooling: s.spot.cooling, icon: s.spot.type.icon)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(s.spot.name).bold()
                        Text("\(s.spot.type.label) · \(formatDistance(s.distance))")
                            .font(.subheadline).foregroundStyle(Theme.textMuted)
                        if let note = s.spot.note {
                            Text(note).font(.footnote).foregroundStyle(Theme.textMuted)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                    .onTapGesture { camera = Geo.camera(showing: [s.spot.location]) }

                    Button(t("spots.routeHere")) { router.route(to: s.spot) }
                        .buttonStyle(.borderedProminent)
                        .font(.subheadline.bold())
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    private func chip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline.bold())
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .foregroundStyle(selected ? .white : Theme.primary)
                .background(selected ? Theme.primary : .white, in: Capsule())
                .overlay(Capsule().stroke(Theme.primary, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    // MARK: Reporting

    private var pickPanel: some View {
        VStack(spacing: 12) {
            Text(t("spots.tapToPin")).font(.title3.bold()).multilineTextAlignment(.center)
            Button {
                step = .level(heat.location)
            } label: {
                Label(t("spots.useMyLocation"), systemImage: "location.fill")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            cancelButton
            Spacer()
        }
        .padding(16)
    }

    private func levelPanel(_ where_: LatLng) -> some View {
        VStack(spacing: 12) {
            Text(t("spots.howHot")).font(.title3.bold()).multilineTextAlignment(.center)
            HStack(spacing: 10) {
                ForEach(HotLevel.allCases, id: \.self) { level in
                    Button {
                        save(level, at: where_)
                    } label: {
                        VStack(spacing: 6) {
                            HeatBars(level: level)
                            Text(level.label).bold()
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, minHeight: 80)
                        .background(Theme.heatButton(level), in: RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(level.label)
                }
            }
            cancelButton
            Spacer()
        }
        .padding(16)
    }

    private var cancelButton: some View {
        Button(t("common.cancel")) { step = .none }
            .buttonStyle(.bordered)
            .controlSize(.large)
            .frame(maxWidth: .infinity)
    }

    private func save(_ level: HotLevel, at where_: LatLng) {
        reports = ReportStore.add(at: where_, level: level)
        step = .none
        showHeat = true
        withAnimation { message = t("spots.saved") }
        Task {
            try? await Task.sleep(for: .seconds(3))
            withAnimation { message = nil }
        }
    }
}
