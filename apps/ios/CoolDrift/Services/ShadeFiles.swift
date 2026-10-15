// ShadeFiles.swift — small helpers for reading LTA's covered walkway download:
//   • ZipReader: takes one file out of a .zip (iOS has no built-in .zip API)
//   • Shapefile: reads the walkway outlines (polygons) from a .shp file
//   • SVY21: turns Singapore map-grid coordinates into latitude/longitude

import Compression
import Foundation

enum ZipReader {
    /// The uncompressed bytes of the first file in the zip whose name ends with `suffix`.
    nonisolated static func file(endingWith suffix: String, in zip: Data) -> Data? {
        let b = [UInt8](zip)
        func u16(_ o: Int) -> Int { o + 1 < b.count ? Int(b[o]) | Int(b[o + 1]) << 8 : 0 }
        func u32(_ o: Int) -> Int { u16(o) | u16(o + 2) << 16 }

        // The "central directory" at the end lists every file in the zip.
        var end = b.count - 22
        while end >= 0, u32(end) != 0x0605_4B50 { end -= 1 }
        guard end >= 0 else { return nil }
        var p = u32(end + 16)
        for _ in 0..<u16(end + 10) {
            guard u32(p) == 0x0201_4B50 else { return nil }
            let method = u16(p + 10), packed = u32(p + 20), size = u32(p + 24)
            let nameLength = u16(p + 28), extraLength = u16(p + 30), commentLength = u16(p + 32)
            let name = String(decoding: b[(p + 46)..<(p + 46 + nameLength)], as: UTF8.self)
            if name.lowercased().hasSuffix(suffix) {
                let local = u32(p + 42)
                let start = local + 30 + u16(local + 26) + u16(local + 28)
                guard start + packed <= b.count else { return nil }
                let data = Array(b[start..<(start + packed)])
                if method == 0 { return Data(data) } // stored, not compressed
                guard method == 8 else { return nil } // 8 = deflate
                var out = [UInt8](repeating: 0, count: size)
                let written = compression_decode_buffer(&out, size, data, packed, nil, COMPRESSION_ZLIB)
                return written == size ? Data(out) : nil
            }
            p += 46 + nameLength + extraLength + commentLength
        }
        return nil
    }
}

enum Shapefile {
    /// Every polygon in a .shp file, as rings of (northing, easting) map-grid points.
    nonisolated static func polygons(_ data: Data) -> [[[(n: Double, e: Double)]]] {
        let b = [UInt8](data)
        func be32(_ o: Int) -> Int { Int(Int32(bitPattern: UInt32(b[o]) << 24 | UInt32(b[o + 1]) << 16 | UInt32(b[o + 2]) << 8 | UInt32(b[o + 3]))) }
        func le32(_ o: Int) -> Int { Int(Int32(bitPattern: UInt32(b[o]) | UInt32(b[o + 1]) << 8 | UInt32(b[o + 2]) << 16 | UInt32(b[o + 3]) << 24)) }
        func double(_ o: Int) -> Double {
            var bits: UInt64 = 0
            for i in 0..<8 { bits |= UInt64(b[o + i]) << (8 * UInt64(i)) }
            return Double(bitPattern: bits)
        }

        var out: [[[(n: Double, e: Double)]]] = []
        var i = 100 // skip the file header
        while i + 8 <= b.count {
            let length = be32(i + 4) * 2
            let r = i + 8
            i = r + length
            guard length >= 44, i <= b.count, [5, 15, 25].contains(le32(r)) else { continue } // polygons only
            let partCount = le32(r + 36), pointCount = le32(r + 40)
            let parts = (0..<partCount).map { le32(r + 44 + 4 * $0) } + [pointCount]
            let base = r + 44 + 4 * partCount
            guard base + 16 * pointCount <= b.count else { continue }
            out.append((0..<partCount).map { p in
                (parts[p]..<parts[p + 1]).map { j in (n: double(base + 16 * j + 8), e: double(base + 16 * j)) }
            })
        }
        return out
    }
}

enum SVY21 {
    // Singapore's map grid (SVY21, a Transverse Mercator projection), standard SLA parameters.
    private nonisolated static let a = 6_378_137.0, f = 1 / 298.257223563
    private nonisolated static let oLat = 1.366666, oLon = 103.833333, oN = 38744.572, oE = 28001.642, k = 1.0

    /// Northing/easting in metres → latitude/longitude.
    nonisolated static func toLatLng(n north: Double, e east: Double) -> LatLng {
        let b = a * (1 - f), e2 = 2 * f - f * f, e4 = e2 * e2, e6 = e4 * e2
        let a0 = 1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256
        let a2 = 3.0 / 8 * (e2 + e4 / 4 + 15 * e6 / 128)
        let a4 = 15.0 / 256 * (e4 + 3 * e6 / 4)
        let a6 = 35 * e6 / 3072
        let r0 = oLat * .pi / 180
        let m0 = a * (a0 * r0 - a2 * sin(2 * r0) + a4 * sin(4 * r0) - a6 * sin(6 * r0))

        let mPrime = m0 + (north - oN) / k
        let n = (a - b) / (a + b), n2 = n * n, n3 = n2 * n, n4 = n2 * n2
        let g = a * (1 - n) * (1 - n2) * (1 + 9 * n2 / 4 + 225 * n4 / 64) * (.pi / 180)
        let s = mPrime * .pi / (180 * g)
        let latP = s + (3 * n / 2 - 27 * n3 / 32) * sin(2 * s) + (21 * n2 / 16 - 55 * n4 / 32) * sin(4 * s)
            + 151 * n3 / 96 * sin(6 * s) + 1097 * n4 / 512 * sin(8 * s)
        let sl = sin(latP)
        let rho = a * (1 - e2) / pow(1 - e2 * sl * sl, 1.5)
        let v = a / sqrt(1 - e2 * sl * sl)
        let psi = v / rho, t = tan(latP)
        let ePrime = east - oE
        let x = ePrime / (k * v), x2 = x * x
        let lat = latP - (t / (k * rho)) * (x * ePrime / 2)
            + (t / (k * rho)) * (x2 * x * ePrime / 24) * (-4 * psi * psi + 9 * psi * (1 - t * t) + 12 * t * t)
        let sec = 1 / cos(latP)
        let lon = oLon * .pi / 180 + sec * x - sec * (x * x2 / 6) * (psi + 2 * t * t)
            + sec * (x2 * x2 * x / 120) * (-4 * pow(psi, 3) * (1 - 6 * t * t) + psi * psi * (9 - 68 * t * t) + 72 * psi * t * t + 24 * pow(t, 4))
        return LatLng(latitude: lat * 180 / .pi, longitude: lon * 180 / .pi)
    }
}
