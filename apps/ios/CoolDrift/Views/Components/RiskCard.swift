// RiskCard.swift — the Low / Moderate / High heat card at the top of Home.
// One solid colour per level, the level in big type, what to do right now,
// and a 3-step scale so people can see how far it is from the next level.

import SwiftUI

struct RiskCard: View {
    let risk: RiskLevel
    var huge = false // senior mode
    var advice: String?
    var onSpeak: (() -> Void)?

    @ScaledMetric private var levelSize = 44.0
    @ScaledMetric private var hugeLevelSize = 64.0

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(t("risk.title"))
                    .font(.subheadline.bold())
                    .foregroundStyle(.white.opacity(0.8))
                Spacer()
                if let onSpeak {
                    Button(action: onSpeak) {
                        Label(t("home.readAloud"), systemImage: "speaker.wave.2.fill")
                            .font(.subheadline.bold())
                    }
                    .foregroundStyle(.white)
                }
            }

            Text(risk.label)
                .font(.system(size: huge ? hugeLevelSize : levelSize, weight: .bold))
                .accessibilityLabel("\(t("risk.title")): \(risk.label)")

            if let advice {
                Text(advice).font(.title3)
            }

            HStack(alignment: .top, spacing: 4) {
                ForEach(RiskLevel.allCases, id: \.self) { level in
                    VStack(alignment: .leading, spacing: 4) {
                        Rectangle()
                            .fill(.white.opacity(level == risk ? 1 : 0.3))
                            .frame(height: 4)
                        Text(level.label)
                            .font(.footnote.weight(level == risk ? .bold : .regular))
                            .foregroundStyle(.white.opacity(level == risk ? 1 : 0.7))
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.top, 10)
            .accessibilityHidden(true)
        }
        .foregroundStyle(.white)
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.risk(risk), in: RoundedRectangle(cornerRadius: 16))
    }
}
