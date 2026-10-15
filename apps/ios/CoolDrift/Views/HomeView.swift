// HomeView.swift — the heat-risk card, live numbers, safety tips and nearest cool places.
// In Senior mode it shows a much simpler screen with huge text and a voice button.

import SwiftUI

struct HomeView: View {
    @Environment(SettingsStore.self) private var settings
    @Environment(HeatStore.self) private var heat
    @Environment(AppRouter.self) private var router

    var body: some View {
        let risk = heat.risk(demoHigh: settings.value.demoHigh)

        Group {
            if let risk {
                if settings.value.seniorMode {
                    SeniorHome(risk: risk)
                } else {
                    content(risk)
                }
            } else if heat.failed {
                // No live data and nothing saved.
                ContentUnavailableView {
                    Label(t("common.noData"), systemImage: "icloud.slash")
                } actions: {
                    Button(t("common.retry")) { Task { await heat.refresh() } }
                        .buttonStyle(.borderedProminent)
                }
            } else {
                ProgressView(t("common.loading"))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Theme.background)
    }

    private func content(_ risk: RiskLevel) -> some View {
        ScrollView {
            VStack(spacing: 16) {
                StatusBanners()
                RiskCard(risk: risk, advice: tList("tips.\(risk.rawValue)").first) {
                    Speech.speak(heat.spokenSummary(risk), language: settings.value.language)
                }
                if let reading = heat.reading {
                    StatsCard(reading: reading)
                }
                tipsCard(risk)
                nearestCard
            }
            .padding(16)
        }
        .refreshable { await heat.refresh() }
    }

    /// The first tip is already on the heat card, so this shows the rest.
    private func tipsCard(_ risk: RiskLevel) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(t("home.tipsTitle")).font(.title3.bold())
            ForEach(tList("tips.\(risk.rawValue)").dropFirst(), id: \.self) { tip in
                HStack(alignment: .top, spacing: 12) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Theme.risk(risk))
                        .frame(width: 4)
                    Text(tip)
                }
                .fixedSize(horizontal: false, vertical: true)
            }
        }
        .card()
    }

    /// The nearest place of each cooling type: air-con, shaded, green.
    private var nearestCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(t("home.nearestTitle")).font(.title3.bold())
            Text(t("home.nearestHint")).font(.subheadline).foregroundStyle(Theme.textMuted)
                .padding(.bottom, 8)
            ForEach(CoolingType.allCases, id: \.self) { cooling in
                if let near = CoolSpots.nearest(to: heat.location, cooling: cooling) {
                    Divider()
                    Button {
                        router.route(to: near.spot)
                    } label: {
                        HStack(spacing: 12) {
                            CoolingIcon(cooling: cooling)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(near.spot.name).bold().lineLimit(1)
                                Text("\(Text(cooling.label).bold().foregroundStyle(Theme.cooling(cooling))) · \(formatDistance(near.distance))")
                                    .font(.subheadline)
                                    .foregroundStyle(Theme.textMuted)
                            }
                            Spacer()
                            Image(systemName: "chevron.forward").foregroundStyle(Theme.textMuted)
                        }
                        .padding(.vertical, 10)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(cooling.label): \(near.spot.name), \(formatDistance(near.distance))")
                }
            }
        }
        .foregroundStyle(Theme.text)
        .card()
    }
}

/// Live numbers from data.gov.sg in a 2×2 grid.
private struct StatsCard: View {
    let reading: HeatReading

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Grid(horizontalSpacing: 12, verticalSpacing: 12) {
                GridRow {
                    stat(t("home.feelsLike"), reading.heatIndex, "°C")
                    stat(t("home.wbgt"), reading.wbgt, "°C")
                }
                Divider()
                GridRow {
                    stat(t("home.temperature"), reading.temperature, "°C")
                    stat(t("home.humidity"), reading.humidity, "%")
                }
            }
            Text("\(t("home.updated", ["time": formatTime(reading.observedAt), "station": reading.stationName ?? ""])) · \(t(reading.source == .wbgt ? "home.sourceWbgt" : "home.sourceHi"))")
                .font(.footnote)
                .foregroundStyle(Theme.textMuted)
        }
        .card()
    }

    private func stat(_ label: String, _ value: Double?, _ unit: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value.map { "\(($0 * 10).rounded() / 10)\(unit)" } ?? "—")
                .font(.title.bold())
                .foregroundStyle(Theme.text)
            Text(label).font(.subheadline).foregroundStyle(Theme.textMuted).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Senior mode: one huge card, one huge voice button, one "take me there" button.
private struct SeniorHome: View {
    let risk: RiskLevel
    @Environment(SettingsStore.self) private var settings
    @Environment(HeatStore.self) private var heat
    @Environment(AppRouter.self) private var router
    @State private var spoke = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                StatusBanners()
                RiskCard(risk: risk, huge: true, advice: tList("tips.\(risk.rawValue)").first)

                Button(action: readAloud) {
                    Label(t("home.readAloud"), systemImage: "speaker.wave.2.fill")
                        .font(.title2.bold())
                        .frame(maxWidth: .infinity, minHeight: 80)
                }
                .buttonStyle(.borderedProminent)

                if let near = CoolSpots.nearest(to: heat.location) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(t("home.nearest")).font(.title3).foregroundStyle(Theme.textMuted)
                        Text("\(near.spot.name) · \(formatDistance(near.distance))").font(.title.bold())
                        Button {
                            router.route(to: near.spot)
                        } label: {
                            Label(t("home.goThere"), systemImage: "location.fill")
                                .font(.title3.bold())
                                .frame(maxWidth: .infinity, minHeight: 64)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .card()
                }
            }
            .padding(16)
        }
        .task {
            // Read the advice aloud once when the screen opens.
            guard !spoke else { return }
            spoke = true
            readAloud()
        }
    }

    private func readAloud() {
        Speech.speak(heat.spokenSummary(risk), language: settings.value.language)
    }
}
