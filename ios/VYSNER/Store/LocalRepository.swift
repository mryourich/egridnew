import Foundation
import UIKit

/// Keeps all data as one JSON file and pictures as JPEG files on the device.
/// Swap this for a server repository (Supabase) later – the views only talk to `AppStore`.
struct LocalRepository {
    private let base: URL
    private let dataFile: URL
    let photoDir: URL

    init() {
        let fm = FileManager.default
        base = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("VYSNER", isDirectory: true)
        dataFile = base.appendingPathComponent("data.json")
        photoDir = base.appendingPathComponent("photos", isDirectory: true)
        try? fm.createDirectory(at: photoDir, withIntermediateDirectories: true)
    }

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()
    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    func load() -> AppData? {
        guard let raw = try? Data(contentsOf: dataFile),
              let data = try? Self.decoder.decode(AppData.self, from: raw),
              data.version == AppData.version else { return nil }
        return data
    }

    func save(_ data: AppData) {
        guard let raw = try? Self.encoder.encode(data) else { return }
        try? raw.write(to: dataFile, options: .atomic)
    }

    /// Stores a picture (long side max. 2000 px) and returns its file name.
    func storePhoto(_ image: UIImage) -> String? {
        let scaled = image.scaledDown(maxSide: 2000)
        guard let jpeg = scaled.jpegData(compressionQuality: 0.8) else { return nil }
        let name = UUID().uuidString + ".jpg"
        do {
            try jpeg.write(to: photoDir.appendingPathComponent(name), options: .atomic)
            return name
        } catch {
            return nil
        }
    }

    func deletePhoto(_ name: String) {
        guard !name.hasPrefix("asset:") else { return }
        try? FileManager.default.removeItem(at: photoDir.appendingPathComponent(name))
    }

    /// Demo pictures live in the asset catalog ("asset:Name"), own pictures in the photo folder.
    func image(for name: String) -> UIImage? {
        if name.hasPrefix("asset:") { return UIImage(named: String(name.dropFirst(6))) }
        return UIImage(contentsOfFile: photoDir.appendingPathComponent(name).path)
    }

    func reset() {
        try? FileManager.default.removeItem(at: dataFile)
        try? FileManager.default.removeItem(at: photoDir)
        try? FileManager.default.createDirectory(at: photoDir, withIntermediateDirectories: true)
    }
}

extension UIImage {
    func scaledDown(maxSide: CGFloat) -> UIImage {
        let longest = max(size.width, size.height)
        guard longest > maxSide else { return self }
        let factor = maxSide / longest
        let target = CGSize(width: size.width * factor, height: size.height * factor)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
