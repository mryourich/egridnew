import Foundation

/// Same shapes as the web app, so the data can later be synced with the server (Supabase) unchanged.
enum Role: String, Codable, CaseIterable, Identifiable {
    case admin, pl, bl, mk, buero, monteur
    var id: String { rawValue }
    var label: String {
        switch self {
        case .admin: return "Admin"
        case .pl: return "Projektleitung"
        case .bl: return "Bauleitung"
        case .mk: return "Montagekoordination"
        case .buero: return "Büro"
        case .monteur: return "Monteur"
        }
    }
    /// May create projects, areas and points, assign people.
    var isManager: Bool { self != .monteur && self != .buero }
    /// Admin and office see every project of the company.
    var seesAll: Bool { self == .admin || self == .buero }
}

struct Employee: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var role: String
    var access: Role
    var team: String
    var phone: String
    var email: String
    var active: Bool = true

    var initials: String {
        name.split(separator: " ").prefix(2).compactMap { $0.first.map(String.init) }.joined().uppercased()
    }
    var firstName: String { String(name.split(separator: " ").first ?? "") }
}

enum ProjectStatus: String, Codable, CaseIterable {
    case planung, aktiv, pausiert, abgeschlossen
    var label: String {
        switch self {
        case .planung: return "In Planung"
        case .aktiv: return "Aktiv"
        case .pausiert: return "Pausiert"
        case .abgeschlossen: return "Abgeschlossen"
        }
    }
}

struct Project: Codable, Identifiable, Hashable {
    var id: String
    var code: String
    var name: String
    var client: String
    var location: String
    var status: ProjectStatus
    var colorHex: String
    var start: Date
    var end: Date
    var siteManagerId: String
    var createdBy: String
    var members: [String]
    var imageName: String?
    var description: String = ""

    func isMember(_ userId: String) -> Bool { createdBy == userId || members.contains(userId) }
}

enum NodeStatus: String, Codable, CaseIterable {
    case offen, in_arbeit, erledigt
    var label: String {
        switch self {
        case .offen: return "Offen"
        case .in_arbeit: return "In Arbeit"
        case .erledigt: return "Erledigt"
        }
    }
    var next: NodeStatus {
        switch self {
        case .offen: return .in_arbeit
        case .in_arbeit: return .erledigt
        case .erledigt: return .offen
        }
    }
}

/// Entry of a site's structure. Nodes with children are areas, nodes without children are checkable points.
struct SiteNode: Codable, Identifiable, Hashable {
    var id: String
    var projectId: String
    var parentId: String
    var title: String
    var description: String = ""
    var status: NodeStatus = .offen
    var assigneeId: String = ""
    var due: Date?
    var order: Double
}

enum Severity: String, Codable, CaseIterable, Identifiable {
    case niedrig, mittel, hoch, kritisch
    var id: String { rawValue }
    var label: String { rawValue.prefix(1).uppercased() + rawValue.dropFirst() }
    var rank: Int {
        switch self {
        case .kritisch: return 0
        case .hoch: return 1
        case .mittel: return 2
        case .niedrig: return 3
        }
    }
}

enum IssueStatus: String, Codable, CaseIterable {
    case offen, in_arbeit, erledigt
    var label: String {
        switch self {
        case .offen: return "Offen"
        case .in_arbeit: return "In Arbeit"
        case .erledigt: return "Behoben"
        }
    }
}

struct Issue: Codable, Identifiable, Hashable {
    var id: String
    var projectId: String
    var title: String
    var description: String = ""
    var location: String = ""
    var severity: Severity = .mittel
    var status: IssueStatus = .offen
    var assigneeId: String = ""
    var due: Date?
    var createdAt: Date
    var createdBy: String
    var nodeId: String = ""
    /// File names of pictures stored on the device.
    var photo: String?
    var fixPhoto: String?
    var fixedAt: Date?
    var fixedBy: String?
}

struct Photo: Codable, Identifiable, Hashable {
    var id: String
    var projectId: String
    var nodeId: String
    var file: String
    var caption: String = ""
    var takenAt: Date
    var authorId: String
}

struct Activity: Codable, Identifiable, Hashable {
    var id: String
    var at: Date
    var by: String
    var text: String
    var projectId: String
}

struct Company: Codable, Hashable {
    var name: String
    var address: String
}

/// Everything the app keeps – one file on the device until the server sync comes.
struct AppData: Codable {
    static let version = 1
    var version = AppData.version
    var company: Company
    var currentUserId: String
    var employees: [Employee]
    var projects: [Project]
    var nodes: [SiteNode]
    var issues: [Issue]
    var photos: [Photo]
    var activity: [Activity]
}
