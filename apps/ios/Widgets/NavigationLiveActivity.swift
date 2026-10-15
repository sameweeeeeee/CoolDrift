// NavigationLiveActivity.swift — turn-by-turn directions on the Lock Screen and in the
// Dynamic Island while you follow a cool route (like Apple Maps).
// The app starts and updates it from RoutesView; this file only draws it.

import ActivityKit
import SwiftUI
import WidgetKit

private let green = Color(red: 0x1B / 255, green: 0x7A / 255, blue: 0x43 / 255)
private let darkGreen = Color(red: 0x0F / 255, green: 0x55 / 255, blue: 0x30 / 255)

@main
struct CoolDriftWidgets: WidgetBundle {
    var body: some Widget {
        NavigationLiveActivity()
    }
}

struct NavigationLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NavigationAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(darkGreen)
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: context.state.icon)
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(green)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.distance)
                        .font(.title2.bold())
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.instruction)
                        .font(.headline)
                        .lineLimit(2)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.state.remaining).foregroundStyle(.secondary)
                        Spacer()
                        Text("\(context.attributes.arrivalLabel) ") + Text(context.state.arrival, style: .time).bold()
                    }
                    .font(.subheadline)
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                Image(systemName: context.state.icon)
                    .foregroundStyle(green)
                    .fontWeight(.bold)
            } compactTrailing: {
                Text(context.state.distance)
                    .font(.caption.bold())
                    .foregroundStyle(green)
            } minimal: {
                Image(systemName: context.state.icon)
                    .foregroundStyle(green)
            }
            .keylineTint(green)
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<NavigationAttributes>

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: context.state.icon)
                .font(.system(size: 36, weight: .bold))
                .frame(width: 48)
            VStack(alignment: .leading, spacing: 2) {
                if context.state.arrived {
                    Text(context.state.instruction).font(.title3.bold())
                } else {
                    Text(context.state.distance).font(.title2.bold())
                    Text(context.state.instruction).font(.headline).lineLimit(2)
                }
                HStack(spacing: 4) {
                    Text(context.state.remaining)
                    Text("·")
                    Text("\(context.attributes.arrivalLabel) ") + Text(context.state.arrival, style: .time)
                }
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.8))
            }
            Spacer(minLength: 0)
        }
        .foregroundStyle(.white)
        .padding(16)
    }
}
