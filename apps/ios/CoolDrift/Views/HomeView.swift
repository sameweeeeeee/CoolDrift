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
                if let outlook = heat.outlook {
                    TodayCard(outlook: outlook)
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

/// "Today": best time to go out, temperature range and rain, UV and haze.
private struct TodayCard: View {
    let outlook: Outlook

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(t("outlook.title")).font(.title3.bold())

            row(icon: "clock.fill", color: Theme.primary, title: t("outlook.bestTime"), detail: outlook.bestTimeText)

            if outlook.low != nil || outlook.nearbyText != nil {
                let lines = [
                    outlook.low.flatMap { low in outlook.high.map { t("outlook.range", ["low": low, "high": $0]) } },
                    outlook.rainLater ? t("outlook.rainLater") : nil,
                    outlook.nearbyText.flatMap { text in outlook.area.map { t("outlook.nearby", ["area": $0, "text": text]) } },
                ].compactMap { $0 }
                row(icon: outlook.rainLater ? "cloud.bolt.rain.fill" : "cloud.sun.fill", color: Color(hex: 0x1565C0),
                    title: lines.first ?? "", detail: lines.dropFirst().joined(separator: "\n"))
            }

            HStack(spacing: 10) {
                if let uv = outlook.uv, let level = outlook.uvLevel {
                    meter(title: t("outlook.uv"), value: "\(uv)", level: t("outlook.uvLevel.\(level.key)"), danger: level.danger)
                }
                if let psi = outlook.psi, let level = outlook.psiLevel {
                    meter(title: t("outlook.air"), value: "\(psi)", level: t("outlook.psiLevel.\(level.key)"), danger: level.danger)
                }
            }

            // Only show advice when it matters.
            if (outlook.uvLevel?.danger ?? 0) >= 2 {
                Label(t("outlook.uvTip"), systemImage: "sun.max.trianglebadge.exclamationmark.fill")
                    .font(.subheadline).foregroundStyle(Theme.risk(.moderate))
            }
            if (outlook.psiLevel?.danger ?? 0) >= 2 {
                Label(t("outlook.airTip"), systemImage: "aqi.high")
                    .font(.subheadline).foregroundStyle(Theme.risk(.high))
            }
        }
        .card()
    }

    private func row(icon: String, color: Color, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body.weight(.semibold)).foregroundStyle(Theme.text)
                if !detail.isEmpty {
                    Text(detail).font(.subheadline).foregroundStyle(Theme.textMuted)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    /// A small box with a number and a coloured level, e.g. "UV index 6 · High".
    private func meter(title: String, value: String, level: String, danger: Int) -> some View {
        let color: Color = [Theme.risk(.low), Theme.risk(.moderate), Color(hex: 0xD84315), Theme.risk(.high)][danger]
        return VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.footnote).foregroundStyle(Theme.textMuted).lineLimit(1)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(verbatim: value).font(.title2.bold()).foregroundStyle(Theme.text)
                Text(level).font(.footnote.bold()).foregroundStyle(color).lineLimit(1)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
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
            Text(footer)
                .font(.footnote)
                .foregroundStyle(Theme.textMuted)
        }
        .card()
    }

    /// "Updated 2:45 PM · MacRitchie Reservoir · Based on NEA heat stress (WBGT)"
    private var footer: String {
        var updated = t("home.updated", ["time": formatTime(reading.observedAt), "station": reading.stationName ?? ""])
        if reading.stationName?.isEmpty ?? true { updated = updated.replacingOccurrences(of: " · ", with: "") }
        return "\(updated) · \(t(reading.source == .wbgt ? "home.sourceWbgt" : "home.sourceHi"))"
    }

    private func stat(_ label: String, _ value: Double?, _ unit: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(verbatim: value.map { $0.formatted(.number.precision(.fractionLength(0...1))) + unit } ?? "—")
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
