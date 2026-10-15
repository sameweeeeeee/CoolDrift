// Theme.swift — all the app's colours in one place.
// Calm green + white, with strong contrast so text is easy to read outdoors.

import SwiftUI

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

enum Theme {
    static let primary = Color(hex: 0x1B7A43) // deep green (buttons, selected tab)
    static let primaryDark = Color(hex: 0x0F5530)
    static let background = Color(hex: 0xEEF6F1) // soft mint page background
    static let text = Color(hex: 0x10231A)
    static let textMuted = Color(hex: 0x4A5E53)
    static let border = Color(hex: 0xD3E6DA)

    // Route colours
    static let coolRoute = Color(hex: 0x1B7A43)
    static let fastRoute = Color(hex: 0x6B7C73)
    static let restStop = Color(hex: 0x00897B)

    /// Heat-risk colours. All are readable with white text.
    static func risk(_ level: RiskLevel) -> Color {
        switch level {
        case .low: Color(hex: 0x1B7A43)
        case .moderate: Color(hex: 0xB86E00)
        case .high: Color(hex: 0xC62828)
        }
    }

    /// Cooling type colours (pins, labels, icons).
    static func cooling(_ type: CoolingType) -> Color {
        switch type {
        case .aircon: Color(hex: 0x1565C0) // blue = cold
        case .shaded: Color(hex: 0x8A5300) // warm brown = roof / umbrella
        case .green: Color(hex: 0x2E7D32) // leafy green
        }
    }

    /// Light tints of the cooling colours, for soft backgrounds behind icons.
    static func coolingTint(_ type: CoolingType) -> Color {
        switch type {
        case .aircon: Color(hex: 0xE3EEFB)
        case .shaded: Color(hex: 0xF6ECDD)
        case .green: Color(hex: 0xE4F2E5)
        }
    }

    /// Hot spot report colours: yellow → orange → red.
    static func heat(_ level: HotLevel) -> Color {
        switch level {
        case .warm: Color(hex: 0xFFC107)
        case .hot: Color(hex: 0xFF7000)
        case .veryHot: Color(hex: 0xD32F2F)
        }
    }

    /// Solid button colours for "how hot" (dark enough for white text).
    static func heatButton(_ level: HotLevel) -> Color {
        switch level {
        case .warm: Color(hex: 0x8A6D00)
        case .hot: Color(hex: 0xB34700)
        case .veryHot: Color(hex: 0xC62828)
        }
    }
}

extension View {
    /// Liquid Glass button on iOS 26+, a normal bordered button before that.
    @ViewBuilder func glassButton(prominent: Bool = false) -> some View {
        if #available(iOS 26, *) {
            if prominent { buttonStyle(.glassProminent) } else { buttonStyle(.glass) }
        } else {
            if prominent { buttonStyle(.borderedProminent) } else { buttonStyle(.bordered) }
        }
    }

    /// The tab bar shrinks while scrolling down (iOS 26+).
    @ViewBuilder func minimizeTabBarOnScroll() -> some View {
        if #available(iOS 26, *) {
            tabBarMinimizeBehavior(.onScrollDown)
        } else {
            self
        }
    }

    /// A Liquid Glass background on iOS 26+, frosted material before that.
    @ViewBuilder func glassBackground(in shape: some Shape) -> some View {
        if #available(iOS 26, *) {
            glassEffect(.regular, in: shape)
        } else {
            background(.regularMaterial, in: shape)
                .overlay(shape.stroke(.white.opacity(0.6), lineWidth: 0.5))
        }
    }

    /// A white box with a thin border, used for each section on a screen.
    func card() -> some View {
        padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border))
    }
}
