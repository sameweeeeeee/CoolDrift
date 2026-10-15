// NavigationAttributes.swift — what the navigation Live Activity shows on the
// Lock Screen and in the Dynamic Island. Shared by the app (which starts and
// updates it) and the CoolDriftWidgets extension (which draws it).
// The app sends text that's already translated, so the widget needs no translations.

import ActivityKit
import Foundation

nonisolated struct NavigationAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var icon: String // SF Symbol for the next turn
        var instruction: String // e.g. "Turn left onto Lorong 2"
        var distance: String // distance to the next turn, e.g. "120 m"
        var arrival: Date // estimated arrival time
        var remaining: String // e.g. "8 min · 600 m"
        var arrived: Bool
    }

    var destination: String
    var arrivalLabel: String // "Arrival", in the app's language
}
