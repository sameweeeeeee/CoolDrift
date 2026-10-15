// SmallParts.swift — little building blocks used on several screens.

import SwiftUI

/// A round coloured icon at the start of list rows (blue = air-con, brown = shaded, green = green area).
struct CoolingIcon: View {
    let cooling: CoolingType
    var icon: String?
    @ScaledMetric private var size = 44.0

    var body: some View {
        Image(systemName: icon ?? cooling.icon)
            .font(.system(size: size * 0.45))
            .foregroundStyle(Theme.cooling(cooling))
            .frame(width: size, height: size)
            .background(Theme.coolingTint(cooling), in: Circle())
            .accessibilityHidden(true)
    }
}

/// 1–3 filled bars, like a signal meter, for how hot a reported spot is.
struct HeatBars: View {
    let level: HotLevel

    var body: some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(1...3, id: \.self) { n in
                RoundedRectangle(cornerRadius: 2)
                    .frame(width: 8, height: CGFloat(8 + n * 6))
                    .opacity(n <= level.rawValue ? 1 : 0.35)
            }
        }
        .frame(height: 30, alignment: .bottom)
        .accessibilityHidden(true)
    }
}

/// Small notices at the top of Home: "location is off", "you're offline", "demo mode is on".
struct StatusBanners: View {
    @Environment(SettingsStore.self) private var settings
    @Environment(HeatStore.self) private var heat

    var body: some View {
        VStack(spacing: 8) {
            if settings.value.demoHigh {
                banner("flask.fill", t("risk.demo"), color: Theme.risk(.high), tint: Color(hex: 0xFDECEC))
            }
            if heat.locationStatus == .denied || heat.locationStatus == .error {
                banner("location.slash.fill", t("common.locationDenied"), color: Color(hex: 0x7A4A00), tint: Color(hex: 0xFFF4E0))
            }
            if let reading = heat.reading, reading.fromCache {
                banner("icloud.slash.fill", t("common.offline", ["time": formatTime(reading.observedAt)]), color: Color(hex: 0x7A4A00), tint: Color(hex: 0xFFF4E0))
            }
        }
    }

    private func banner(_ icon: String, _ text: String, color: Color, tint: Color) -> some View {
        Label(text, systemImage: icon)
            .font(.subheadline.bold())
            .foregroundStyle(color)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(tint, in: RoundedRectangle(cornerRadius: 12))
    }
}
