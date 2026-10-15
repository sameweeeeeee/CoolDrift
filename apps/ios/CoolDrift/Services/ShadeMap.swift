// ShadeMap.swift — knows which bits of Singapore are in shade, so routes can prefer them.
//
// The app fetches the data itself, quietly in the background, and keeps it on the phone:
//   • LTA covered linkways (roofed walkways), one ~1 MB download from LTA DataMall,
//     the first time the app opens (refreshed every 2 months).
//   • NParks street and park trees (TreesSG), only for the area you're in or routing
//     through, in squares about 1 km across (about 100 KB each).
//     NOTE: NParks doesn't state a licence for TreesSG — check with NParks before a public launch.
// No account, key or server of our own. If a download fails, routes still work;
// that area just doesn't count as shaded until the next try.
//
// Singapore is split into small cells (about 22 m across). A cell's shade level is:
//   3 = roofed walkway   2 = many trees   1 = a few trees   0 = none

import Foundation

enum ShadeMap {
    // MARK: Grid

    nonisolated static let lat0 = 1.15, lng0 = 103.55, step = 0.0002 // 0.0002° ≈ 22 m
    nonisolated static let cols = 2750
    nonisolated static let tileSize = 0.01 // tree squares, ≈ 1.1 km

    nonisolated static func cell(_ p: LatLng) -> UInt32? {
        let r = Int((p.latitude - lat0) / step), c = Int((p.longitude - lng0) / step)
        guard r >= 0, c >= 0, c < cols, r < 1750 else { return nil }
        return UInt32(r * cols + c)
    }

    nonisolated static func tile(_ p: LatLng) -> Int {
        Int((p.latitude - lat0) / tileSize) * 1000 + Int((p.longitude - lng0) / tileSize)
    }

    private static var covered: Set<UInt32> = []
    private static var trees: [UInt32: UInt8] = [:]
    private static var loadedTiles: Set<Int> = []
    private static var coveredReady = false

    static func level(at p: LatLng) -> UInt8 {
        guard let id = cell(p) else { return 0 }
        return covered.contains(id) ? 3 : trees[id] ?? 0
    }

    // MARK: Scoring routes

    /// How much a shade level counts: a roof is full shade, a few trees only partly.
    private static func weight(_ level: UInt8) -> Double {
        switch level {
        case 3: 1.0
        case 2: 0.8
        case 1: 0.4
        default: 0
        }
    }

    /// Points every ~10 m along a path, so long straight lines count fairly.
    private static func samples(_ path: [LatLng], every metres: Double = 10) -> [LatLng] {
        var out: [LatLng] = []
        for (a, b) in zip(path, path.dropFirst()) {
            let n = max(1, Int(Geo.distance(a, b) / metres))
            for i in 0..<n {
                let f = Double(i) / Double(n)
                out.append(LatLng(latitude: a.latitude + (b.latitude - a.latitude) * f,
                                  longitude: a.longitude + (b.longitude - a.longitude) * f))
            }
        }
        return out
    }

    /// The share of a route that is in shade, 0–100.
    static func percent(_ path: [LatLng]) -> Int {
        let pts = samples(path)
        guard !pts.isEmpty else { return 0 }
        let total = pts.reduce(0) { $0 + weight(level(at: $1)) }
        return Int((total / Double(pts.count) * 100).rounded())
    }

    /// The route cut into shaded and sunny pieces, for drawing it in two colours.
    static func pieces(_ path: [LatLng]) -> [(shaded: Bool, points: [LatLng])] {
        var out: [(shaded: Bool, points: [LatLng])] = []
        for p in samples(path) + (path.last.map { [$0] } ?? []) {
            let shaded = level(at: p) >= 2
            if let last = out.last, last.shaded == shaded {
                out[out.count - 1].points.append(p)
            } else {
                // Start the new piece where the last one ended, so there are no gaps.
                out.append((shaded, (out.last?.points.last.map { [$0] } ?? []) + [p]))
            }
        }
        return out
    }

    // MARK: Getting the data

    /// At launch: walkways, plus the trees in the 9 squares around the user. Quiet; never shows errors.
    static func warmUp(around here: LatLng) async {
        await loadCovered()
        let t = tile(here)
        await loadTiles(Set([-1001, -1000, -999, -1, 0, 1, 999, 1000, 1001].map { t + $0 }))
    }

    /// Before scoring routes: make sure we have the trees along all of them.
    static func prepare(_ paths: [[LatLng]]) async {
        await loadCovered()
        await loadTiles(Set(paths.flatMap { samples($0, every: 200) }.map(tile)))
    }

    private static var folder: URL {
        let url = URL.applicationSupportDirectory.appending(path: "Shade")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    /// True if the saved file exists and is newer than `days`.
    private static func fresh(_ url: URL, days: Double) -> Bool {
        guard let date = (try? FileManager.default.attributesOfItem(atPath: url.path))?[.modificationDate] as? Date
        else { return false }
        return Date.now.timeIntervalSince(date) < days * 86400
    }

    private static func loadCovered() async {
        guard !coveredReady else { return }
        let file = folder.appending(path: "covered.bin")
        if let data = try? Data(contentsOf: file) {
            covered = Set(data.withUnsafeBytes { Array($0.bindMemory(to: UInt32.self)) })
            if fresh(file, days: 60) { coveredReady = true; return }
        }
        guard let cells = await Task.detached(operation: { await downloadCovered() }).value, !cells.isEmpty else { return }
        covered = cells
        coveredReady = true
        try? Array(cells).withUnsafeBufferPointer { Data(buffer: $0) }.write(to: file)
    }

    private static func loadTiles(_ keys: Set<Int>) async {
        var missing: [Int] = []
        for key in keys.subtracting(loadedTiles) {
            let file = folder.appending(path: "trees-\(key).bin")
            if let data = try? Data(contentsOf: file), fresh(file, days: 90) {
                merge(decodeTile(data))
                loadedTiles.insert(key)
            } else {
                missing.append(key)
            }
        }
        // Download up to 4 squares at a time.
        for batch in stride(from: 0, to: missing.count, by: 4).map({ Array(missing[$0..<min($0 + 4, missing.count)]) }) {
            let results = await withTaskGroup(of: (Int, [UInt32: UInt8]?).self) { group in
                for key in batch { group.addTask { (key, await downloadTile(key)) } }
                return await group.reduce(into: []) { $0.append($1) }
            }
            for (key, cells) in results {
                guard let cells else { continue } // failed: try again next time
                merge(cells)
                loadedTiles.insert(key)
                try? encodeTile(cells).write(to: folder.appending(path: "trees-\(key).bin"))
            }
        }
    }

    private static func merge(_ cells: [UInt32: UInt8]) {
        trees.merge(cells) { max($0, $1) }
    }

    private nonisolated static func encodeTile(_ cells: [UInt32: UInt8]) -> Data {
        var data = Data()
        for (id, level) in cells {
            withUnsafeBytes(of: id.littleEndian) { data.append(contentsOf: $0) }
            data.append(level)
        }
        return data
    }

    private static func decodeTile(_ data: Data) -> [UInt32: UInt8] {
        var out: [UInt32: UInt8] = [:]
        let b = [UInt8](data)
        var i = 0
        while i + 5 <= b.count {
            out[UInt32(b[i]) | UInt32(b[i + 1]) << 8 | UInt32(b[i + 2]) << 16 | UInt32(b[i + 3]) << 24] = b[i + 4]
            i += 5
        }
        return out
    }

    // MARK: Downloads (off the main thread)

    private nonisolated static func get(_ url: URL) async -> Data? {
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200
        else { return nil }
        return data
    }

    /// LTA's covered linkways → the cells under a roof.
    private nonisolated static func downloadCovered() async -> Set<UInt32>? {
        // LTA renames the file every month (e.g. CoveredLinkWay_Sep2026.zip), so find the link on its page.
        let page = URL(string: "https://datamall.lta.gov.sg/content/datamall/en/static-data.html")!
        guard let html = await get(page).map({ String(decoding: $0, as: UTF8.self) }),
              let match = html.firstMatch(of: /href="([^"]*CoveredLinkWay[^"]*\.zip)"/),
              let zipURL = URL(string: String(match.1), relativeTo: page),
              let archive = await get(zipURL),
              let shp = ZipReader.file(endingWith: ".shp", in: archive)
        else { return nil }

        var cells = Set<UInt32>()
        for polygon in Shapefile.polygons(shp) {
            let rings = polygon.map { $0.map { SVY21.toLatLng(n: $0.n, e: $0.e) } }
            // Walkways are often narrower than a cell, so mark every cell the outline passes through...
            for ring in rings {
                for (a, b) in zip(ring, ring.dropFirst() + ring.prefix(1)) {
                    let n = max(1, Int(hypot(b.latitude - a.latitude, b.longitude - a.longitude) / (step / 4)))
                    for s in 0...n {
                        let f = Double(s) / Double(n)
                        if let id = cell(LatLng(latitude: a.latitude + (b.latitude - a.latitude) * f,
                                                longitude: a.longitude + (b.longitude - a.longitude) * f)) {
                            cells.insert(id)
                        }
                    }
                }
            }
            // ...and every cell whose centre is inside a big roof.
            guard let outer = rings.first, !outer.isEmpty else { continue }
            let lats = outer.map(\.latitude), lngs = outer.map(\.longitude)
            let r0 = Int((lats.min()! - lat0) / step), r1 = Int((lats.max()! - lat0) / step)
            let c0 = Int((lngs.min()! - lng0) / step), c1 = Int((lngs.max()! - lng0) / step)
            guard r1 - r0 < 200, c1 - c0 < 200 else { continue } // skip anything implausibly big
            for r in max(r0, 0)...max(r1, 0) {
                for c in max(c0, 0)...max(c1, 0) {
                    let centre = LatLng(latitude: lat0 + (Double(r) + 0.5) * step, longitude: lng0 + (Double(c) + 0.5) * step)
                    if inside(centre, rings), let id = cell(centre) { cells.insert(id) }
                }
            }
        }
        return cells
    }

    private nonisolated static func inside(_ p: LatLng, _ rings: [[LatLng]]) -> Bool {
        var hit = false
        for ring in rings {
            for (a, b) in zip(ring, ring.dropFirst() + ring.prefix(1))
            where (a.latitude > p.latitude) != (b.latitude > p.latitude)
                && p.longitude < (b.longitude - a.longitude) * (p.latitude - a.latitude) / (b.latitude - a.latitude) + a.longitude {
                hit.toggle()
            }
        }
        return hit
    }

    /// NParks' trees in one square → cell levels (about 3 tall trees in a cell = good shade).
    private nonisolated static func downloadTile(_ key: Int) async -> [UInt32: UInt8]? {
        let south = lat0 + Double(key / 1000) * tileSize, west = lng0 + Double(key % 1000) * tileSize
        var score: [UInt32: Int] = [:]
        var offset = 0
        while true {
            var url = URLComponents(string: "https://services6.arcgis.com/s5gdswleLl0QthYa/arcgis/rest/services/TreesSG_TreeInformation_Trees/FeatureServer/0/query")!
            url.queryItems = [
                .init(name: "where", value: "1=1"),
                .init(name: "geometry", value: "\(west),\(south),\(west + tileSize),\(south + tileSize)"),
                .init(name: "geometryType", value: "esriGeometryEnvelope"),
                .init(name: "inSR", value: "4326"),
                .init(name: "spatialRel", value: "esriSpatialRelIntersects"),
                .init(name: "outFields", value: "HEIGHT"),
                .init(name: "outSR", value: "4326"),
                .init(name: "geometryPrecision", value: "6"),
                .init(name: "resultOffset", value: "\(offset)"),
                .init(name: "resultRecordCount", value: "2000"),
                .init(name: "f", value: "json"),
            ]
            guard let data = await get(url.url!),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let features = json["features"] as? [[String: Any]]
            else { return nil }
            for f in features {
                guard let g = f["geometry"] as? [String: Any], let x = g["x"] as? Double, let y = g["y"] as? Double,
                      let id = cell(LatLng(latitude: y, longitude: x)) else { continue }
                // HEIGHT looks like "6-9" (metres). Trees 6 m and taller count double.
                let height = ((f["attributes"] as? [String: Any])?["HEIGHT"] as? String) ?? ""
                let low = Int(height.prefix { $0.isNumber }) ?? 0
                score[id, default: 0] += low >= 6 ? 2 : 1
            }
            offset += features.count
            if features.isEmpty || json["exceededTransferLimit"] as? Bool != true { break }
        }
        return score.mapValues { $0 >= 6 ? 2 : 1 }
    }
}
