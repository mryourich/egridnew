import SwiftUI

enum Theme {
    static let navy = Color(hex: "#0b1530")
    static let primary = Color(hex: "#1a5cff")
    static let cyan = Color(hex: "#00b4d8")
    static let green = Color(hex: "#16a34a")
    static let amber = Color(hex: "#f59e0b")
    static let red = Color(hex: "#dc2626")
    static let card = Color(.secondarySystemGroupedBackground)
    static let page = Color(.systemGroupedBackground)
}

extension Color {
    init(hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var value: UInt64 = 0
        Scanner(string: clean).scanHexInt64(&value)
        self.init(red: Double((value >> 16) & 0xff) / 255,
                  green: Double((value >> 8) & 0xff) / 255,
                  blue: Double(value & 0xff) / 255)
    }
}

extension NodeStatus {
    var color: Color {
        switch self {
        case .offen: return .secondary
        case .in_arbeit: return Theme.amber
        case .erledigt: return Theme.green
        }
    }
    var icon: String {
        switch self {
        case .offen: return "circle"
        case .in_arbeit: return "circle.lefthalf.filled"
        case .erledigt: return "checkmark.circle.fill"
        }
    }
}

extension IssueStatus {
    var color: Color {
        switch self {
        case .offen: return Theme.red
        case .in_arbeit: return Theme.amber
        case .erledigt: return Theme.green
        }
    }
}

extension Severity {
    var color: Color {
        switch self {
        case .kritisch: return Theme.red
        case .hoch: return Color(hex: "#ea580c")
        case .mittel: return Theme.amber
        case .niedrig: return .secondary
        }
    }
}

extension Date {
    /// "heute", "morgen", "gestern" or "12. Okt."
    var dayLabel: String {
        let cal = Calendar.current
        if cal.isDateInToday(self) { return "heute" }
        if cal.isDateInTomorrow(self) { return "morgen" }
        if cal.isDateInYesterday(self) { return "gestern" }
        return formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "de_AT")))
    }

    var relativeLabel: String {
        let f = RelativeDateTimeFormatter()
        f.locale = Locale(identifier: "de_AT")
        f.unitsStyle = .short
        return f.localizedString(for: self, relativeTo: Date())
    }
}

/// Round initials badge like in the web app.
struct Avatar: View {
    let employee: Employee?
    var size: CGFloat = 32

    var body: some View {
        Text(employee?.initials ?? "?")
            .font(.system(size: size * 0.38, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(color))
            .accessibilityLabel(employee?.name ?? "Niemand")
    }

    private var color: Color {
        let palette = [Theme.primary, Theme.cyan, Color(hex: "#7c3aed"), Theme.green, Color(hex: "#ea580c"), Color(hex: "#0f766e")]
        let sum = (employee?.id ?? "").unicodeScalars.reduce(0) { $0 + Int($1.value) }
        return palette[sum % palette.count]
    }
}

struct Chip: View {
    let text: String
    var color: Color = .secondary

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .foregroundStyle(color)
            .background(Capsule().fill(color.opacity(0.13)))
    }
}

struct ProgressRing: View {
    let value: Double
    var size: CGFloat = 44
    var line: CGFloat = 5

    var body: some View {
        ZStack {
            Circle().stroke(Color.secondary.opacity(0.18), lineWidth: line)
            Circle()
                .trim(from: 0, to: max(0.001, value))
                .stroke(Theme.primary, style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int((value * 100).rounded()))%")
                .font(.system(size: size * 0.26, weight: .bold))
        }
        .frame(width: size, height: size)
    }
}

/// Shows a stored or demo picture.
struct StoredImage: View {
    @Environment(AppStore.self) private var store
    let name: String

    var body: some View {
        if let image = store.image(name) {
            Image(uiImage: image).resizable().scaledToFill()
        } else {
            ZStack {
                Theme.navy.opacity(0.08)
                Image(systemName: "photo").foregroundStyle(.secondary)
            }
        }
    }
}

/// Header picture of a project, or a coloured placeholder with the code.
struct ProjectImage: View {
    let project: Project

    var body: some View {
        if let name = project.imageName, let image = UIImage(named: name) {
            Image(uiImage: image).resizable().scaledToFill()
        } else {
            ZStack {
                LinearGradient(colors: [Color(hex: project.colorHex), Theme.navy], startPoint: .topLeading, endPoint: .bottomTrailing)
                Text(project.code).font(.headline).foregroundStyle(.white.opacity(0.85))
            }
        }
    }
}

struct SectionTitle: View {
    let title: String
    var trailing: String?

    var body: some View {
        HStack {
            Text(title).font(.headline)
            Spacer()
            if let trailing { Text(trailing).font(.subheadline).foregroundStyle(.secondary) }
        }
    }
}

struct EmptyHint: View {
    let icon: String
    let text: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon).font(.title2).foregroundStyle(.secondary)
            Text(text).font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
    }
}
