// SpotsView.swift — full-screen map of cool places, with a list in a panel you drag up and down.
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
    @State private var detent = PanelDetent.half

    private static let mapPinLimit = 80 // only the nearest go on the map, so it stays smooth

    private var spots: [SpotDistance] {
        CoolSpots.byDistance(from: heat.location).filter { filter == nil || $0.spot.type == filter }
    }

    private var pendingReport: LatLng? {
        if case .level(let where_) = step { return where_ }
        return nil
    }

    var body: some View {
        ZStack(alignment: .top) {
            map.ignoresSafeArea()
            topBar
            panel
        }
        .onAppear { reports = ReportStore.load() }
        .onChange(of: heat.location, initial: true) { _, here in
            // Show the user together with the 3 nearest cool spots.
            let nearby = CoolSpots.byDistance(from: here).prefix(3).map(\.spot.location)
            camera = Geo.camera(showing: [here] + nearby)
        }
        .onChange(of: step) { _, step in
            // While reporting, shrink the panel so the map is free to tap.
            withAnimation(.snappy) { detent = step == .none ? .half : .collapsed }
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
            .onTapGesture { point in
                guard step == .pick, let coordinate = proxy.convert(point, from: .local) else { return }
                step = .level(LatLng(coordinate))
            }
        }
    }

    /// Glass buttons floating at the top of the map, plus the "thanks" message.
    private var topBar: some View {
        VStack(spacing: 10) {
            if step == .none {
                HStack {
                    Button {
                        step = .pick
                    } label: {
                        Label(t("spots.report"), systemImage: "flame.fill")
                    }
                    .tint(Theme.risk(.high))
                    .glassButton(prominent: true)

                    Spacer()

                    Button {
                        withAnimation { showHeat.toggle() }
                    } label: {
                        Label(t("spots.showReports"), systemImage: showHeat ? "eye" : "eye.slash")
                    }
                    .foregroundStyle(Theme.text)
                    .glassButton()
                }
                .font(.subheadline.bold())
            }
            if let message {
                Text(message)
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.primaryDark, in: Capsule())
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    // MARK: Panel

    private var panel: some View {
        DraggablePanel(detent: $detent, collapsedHeight: step == .none ? 150 : 230) {
            switch step {
            case .none: listHeader
            case .pick: pickPanel
            case .level(let where_): levelPanel(where_)
            }
        } content: {
            if step == .none { list }
        }
    }

    private var listHeader: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(t("spots.title")).font(.title3.bold())
                Spacer()
                Text(verbatim: "\(spots.count)").font(.subheadline).foregroundStyle(Theme.textMuted)
            }
            .padding(.horizontal, 20)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    chip(t("spots.all"), selected: filter == nil) { filter = nil }
                    ForEach(SpotType.allCases, id: \.self) { type in
                        chip(type.label, icon: type.icon, selected: filter == type) { filter = type }
                    }
                }
                .padding(.horizontal, 20)
            }
        }
        .padding(.bottom, 10)
    }

    private var list: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                if showHeat && !reports.isEmpty {
                    Label(t("spots.legend"), systemImage: "flame")
                        .font(.footnote)
                        .foregroundStyle(Theme.textMuted)
                        .padding(.vertical, 8)
                }
                ForEach(spots) { s in
                    row(s)
                    Divider().padding(.leading, 56)
                }
            }
            .padding(.horizontal, 20)
        }
    }

    private func row(_ s: SpotDistance) -> some View {
        HStack(spacing: 12) {
            Button {
                camera = Geo.camera(showing: [s.spot.location])
                withAnimation(.snappy) { detent = .collapsed }
            } label: {
                HStack(spacing: 12) {
                    CoolingIcon(cooling: s.spot.cooling, icon: s.spot.type.icon)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(s.spot.name).font(.body.weight(.semibold)).foregroundStyle(Theme.text)
                        Text("\(Text(s.spot.cooling.label).foregroundStyle(Theme.cooling(s.spot.cooling)).bold()) · \(s.spot.type.label) · \(formatDistance(s.distance))")
                            .font(.subheadline)
                            .foregroundStyle(Theme.textMuted)
                        if let note = s.spot.note {
                            Text(note).font(.footnote).foregroundStyle(Theme.textMuted).lineLimit(2)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Button {
                router.route(to: s.spot)
            } label: {
                Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Theme.primary, in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(t("spots.routeHere")): \(s.spot.name)")
        }
        .padding(.vertical, 10)
    }

    private func chip(_ label: String, icon: String? = nil, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon { Image(systemName: icon).font(.caption) }
                Text(label)
            }
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .foregroundStyle(selected ? .white : Theme.text)
            .background(selected ? AnyShapeStyle(Theme.primary) : AnyShapeStyle(.white.opacity(0.7)), in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    // MARK: Reporting

    private var pickPanel: some View {
        VStack(spacing: 12) {
            Text(t("spots.tapToPin")).font(.headline).multilineTextAlignment(.center)
            Button {
                step = .level(heat.location)
            } label: {
                Label(t("spots.useMyLocation"), systemImage: "location.fill")
                    .bold()
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.capsule)
            cancelButton
        }
        .padding(.horizontal, 20)
    }

    private func levelPanel(_ where_: LatLng) -> some View {
        VStack(spacing: 12) {
            Text(t("spots.howHot")).font(.headline).multilineTextAlignment(.center)
            HStack(spacing: 10) {
                ForEach(HotLevel.allCases, id: \.self) { level in
                    Button {
                        save(level, at: where_)
                    } label: {
                        VStack(spacing: 6) {
                            HeatBars(level: level)
                            Text(level.label).font(.subheadline.bold())
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, minHeight: 76)
                        .background(Theme.heatButton(level), in: RoundedRectangle(cornerRadius: 16))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(level.label)
                }
            }
            cancelButton
        }
        .padding(.horizontal, 20)
    }

    private var cancelButton: some View {
        Button(t("common.cancel")) { step = .none }
            .font(.body.weight(.semibold))
            .foregroundStyle(Theme.text)
            .frame(maxWidth: .infinity, minHeight: 36)
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
