// RouteStep.swift — one turn-by-turn instruction, like "Turn left onto Lorong 2".
// The routing server (OSRM) tells us WHAT happens at each turn ("turn" + "left");
// we turn that into words in the app's language and pick an arrow icon.

import Foundation

struct RouteStep: Identifiable {
    enum Kind: Equatable {
        case depart
        case turn(Direction)
        case keep(Direction) // forks and slight bends
        case continueOn
        case roundabout
        case uturn
        case rest(CoolSpot) // a cool spot on the way
        case arrive
    }

    enum Direction: String {
        case left, right, slightLeft, slightRight, sharpLeft, sharpRight

        var label: String { t("nav.dir.\(rawValue)") }
    }

    let id = UUID()
    let kind: Kind
    let road: String // street name, can be empty (e.g. park paths)
    let location: LatLng // where the turn is
    var distance: Double // metres from this turn to the next one

    func instruction(destination: String) -> String {
        let named = !road.isEmpty
        switch kind {
        case .depart: return named ? t("nav.depart", ["road": road]) : t("nav.start")
        case .turn(let d): return named ? t("nav.turn", ["dir": d.label, "road": road]) : t("nav.turnNoRoad", ["dir": d.label])
        case .keep(let d): return named ? t("nav.keep", ["dir": d.label, "road": road]) : t("nav.keepNoRoad", ["dir": d.label])
        case .continueOn: return named ? t("nav.continue", ["road": road]) : t("nav.continueNoRoad")
        case .roundabout: return named ? t("nav.roundabout", ["road": road]) : t("nav.roundaboutNoRoad")
        case .uturn: return t("nav.uturn")
        case .rest(let spot): return t("nav.rest", ["name": spot.name])
        case .arrive: return t("nav.arriveAt", ["name": destination])
        }
    }

    var icon: String {
        switch kind {
        case .depart: "location.north.fill"
        case .turn(let d), .keep(let d):
            switch d {
            case .left: "arrow.turn.up.left"
            case .right: "arrow.turn.up.right"
            case .slightLeft: "arrow.up.left"
            case .slightRight: "arrow.up.right"
            case .sharpLeft: "arrow.down.left"
            case .sharpRight: "arrow.down.right"
            }
        case .continueOn: "arrow.up"
        case .roundabout: "arrow.clockwise"
        case .uturn: "arrow.uturn.down"
        case .rest: "leaf.fill"
        case .arrive: "mappin.circle.fill"
        }
    }

    /// Reads one OSRM maneuver ("turn" + "slight left", etc.).
    /// Returns nil for steps that are just a road changing its name — those get
    /// merged into the step before, so the list stays short.
    static func from(type: String, modifier: String?, road: String, location: LatLng, distance: Double) -> RouteStep? {
        let dir: Direction? = switch modifier {
        case "left": .left
        case "right": .right
        case "slight left": .slightLeft
        case "slight right": .slightRight
        case "sharp left": .sharpLeft
        case "sharp right": .sharpRight
        default: nil
        }
        let kind: Kind
        switch type {
        case "depart": kind = .depart
        case "arrive": kind = .arrive
        case "roundabout", "rotary", "roundabout turn", "exit roundabout", "exit rotary": kind = .roundabout
        case _ where modifier == "uturn": kind = .uturn
        case "new name", "continue", "notification":
            guard let dir, dir != .slightLeft, dir != .slightRight else { return nil }
            kind = .turn(dir)
        case "fork", "merge", "on ramp", "off ramp":
            kind = dir.map { .keep($0) } ?? .continueOn
        default: // "turn", "end of road", ...
            kind = dir.map { .turn($0) } ?? .continueOn
        }
        return RouteStep(kind: kind, road: road, location: location, distance: distance)
    }
}
