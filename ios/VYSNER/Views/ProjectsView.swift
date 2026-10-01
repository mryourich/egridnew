import SwiftUI

struct ProjectsView: View {
    @Environment(AppStore.self) private var store
    @State private var query = ""
    @State private var path: [ProjectRoute] = {
        // For automated screenshots: "-openProject p2 -openSection struktur".
        guard let id = UserDefaults.standard.string(forKey: "openProject") else { return [] }
        let section = UserDefaults.standard.string(forKey: "openSection").flatMap(ProjectSection.init(rawValue:)) ?? .uebersicht
        return [ProjectRoute(projectId: id, section: section)]
    }()

    private var projects: [Project] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return store.myProjects }
        return store.myProjects.filter {
            [$0.name, $0.code, $0.client, $0.location].joined(separator: " ").lowercased().contains(q)
        }
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(spacing: 14) {
                    if projects.isEmpty {
                        EmptyHint(icon: "building.2", text: query.isEmpty ? "Du bist noch keinem Projekt zugeteilt." : "Kein Projekt gefunden.")
                    }
                    ForEach(projects) { p in
                        NavigationLink(value: ProjectRoute(projectId: p.id)) {
                            ProjectRow(project: p)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
            .background(Theme.page)
            .navigationTitle("Projekte")
            .searchable(text: $query, prompt: "Projekt, Kunde, Ort")
            .projectDestinations()
        }
    }
}

struct ProjectRow: View {
    @Environment(AppStore.self) private var store
    let project: Project

    var body: some View {
        let openIssues = store.data.issues.filter { $0.projectId == project.id && $0.status != .erledigt }.count
        HStack(spacing: 14) {
            ProjectImage(project: project)
                .frame(width: 78, height: 78)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    Text(project.code).font(.caption.weight(.semibold)).foregroundStyle(Color(hex: project.colorHex))
                    Spacer()
                    Chip(text: project.status.label, color: project.status == .aktiv ? Theme.green : .secondary)
                }
                Text(project.name).font(.subheadline.weight(.semibold)).foregroundStyle(.primary).lineLimit(2)
                Text("\(project.client) · \(project.location)").font(.caption).foregroundStyle(.secondary).lineLimit(1)
                HStack(spacing: 10) {
                    ProgressView(value: store.progress(project.id)).tint(Color(hex: project.colorHex))
                    if openIssues > 0 {
                        Label("\(openIssues)", systemImage: "exclamationmark.triangle.fill")
                            .font(.caption.weight(.semibold)).foregroundStyle(Theme.amber)
                    }
                }
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.card))
    }
}

enum ProjectSection: String, CaseIterable, Identifiable, Hashable {
    case uebersicht, struktur, maengel, fotos
    var id: String { rawValue }
    var label: String {
        switch self {
        case .uebersicht: return "Übersicht"
        case .struktur: return "Struktur"
        case .maengel: return "Mängel"
        case .fotos: return "Fotos"
        }
    }
}

struct ProjectDetailView: View {
    @Environment(AppStore.self) private var store
    let projectId: String
    @State private var section: ProjectSection

    init(projectId: String, initial: ProjectSection = .uebersicht) {
        self.projectId = projectId
        _section = State(initialValue: initial)
    }

    var body: some View {
        if let project = store.project(projectId) {
            VStack(spacing: 0) {
                Picker("Bereich", selection: $section) {
                    ForEach(ProjectSection.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Theme.page)

                switch section {
                case .uebersicht: ProjectOverview(project: project)
                case .struktur: StructureView(project: project)
                case .maengel: IssuesView(project: project)
                case .fotos: PhotosView(project: project)
                }
            }
            .background(Theme.page)
            .navigationTitle(project.code)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            EmptyHint(icon: "questionmark.folder", text: "Projekt nicht gefunden.")
        }
    }
}

struct ProjectOverview: View {
    @Environment(AppStore.self) private var store
    let project: Project

    var body: some View {
        let points = store.points(of: project.id)
        let done = points.filter { $0.status == .erledigt }.count
        let issues = store.issues(of: project.id)
        let open = issues.filter { $0.status != .erledigt }
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                ZStack(alignment: .bottomLeading) {
                    ProjectImage(project: project)
                        .frame(height: 180)
                        .frame(maxWidth: .infinity)
                        .clipped()
                    LinearGradient(colors: [.clear, .black.opacity(0.65)], startPoint: .center, endPoint: .bottom)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(project.name).font(.title3.bold()).foregroundStyle(.white)
                        Text("\(project.client) · \(project.location)").font(.subheadline).foregroundStyle(.white.opacity(0.85))
                    }
                    .padding(14)
                }
                .clipShape(RoundedRectangle(cornerRadius: 16))

                HStack(spacing: 14) {
                    ProgressRing(value: store.progress(project.id), size: 64, line: 7)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(done) von \(points.count) Punkten erledigt").font(.subheadline.weight(.semibold))
                        Text("\(project.start.formatted(date: .abbreviated, time: .omitted)) – \(project.end.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption).foregroundStyle(.secondary)
                        Chip(text: project.status.label, color: project.status == .aktiv ? Theme.green : .secondary)
                    }
                    Spacer()
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))

                if !project.description.isEmpty {
                    Text(project.description).font(.subheadline).foregroundStyle(.secondary)
                }

                HStack(spacing: 12) {
                    Kpi(title: "Offene Mängel", value: "\(open.count)", icon: "exclamationmark.triangle", color: Theme.amber)
                    Kpi(title: "Fotos", value: "\(store.photos(of: project.id).count)", icon: "photo.on.rectangle", color: Theme.cyan)
                }

                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(title: "Team", trailing: "\(store.team(of: project).count)")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 14) {
                            ForEach(store.team(of: project)) { e in
                                VStack(spacing: 4) {
                                    Avatar(employee: e, size: 40)
                                    Text(e.firstName).font(.caption2).lineLimit(1)
                                }
                                .frame(width: 56)
                            }
                        }
                    }
                    if let lead = store.employee(project.siteManagerId) {
                        HStack {
                            Text("Bauleitung: \(lead.name)").font(.caption).foregroundStyle(.secondary)
                            Spacer()
                            if let url = URL(string: "tel:\(lead.phone.replacingOccurrences(of: " ", with: ""))") {
                                Link(destination: url) { Label("Anrufen", systemImage: "phone.fill").font(.caption.weight(.semibold)) }
                            }
                        }
                    }
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))

                VStack(alignment: .leading, spacing: 12) {
                    SectionTitle(title: "Aktivität")
                    let items = store.activity(of: project.id).prefix(5)
                    if items.isEmpty { Text("Noch keine Aktivität.").font(.subheadline).foregroundStyle(.secondary) }
                    ForEach(Array(items)) { a in
                        HStack(alignment: .top, spacing: 10) {
                            Avatar(employee: store.employee(a.by), size: 26)
                            VStack(alignment: .leading, spacing: 2) {
                                (Text(store.name(a.by)).bold() + Text(" " + a.text)).font(.subheadline)
                                Text(a.at.relativeLabel).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
            }
            .padding(16)
        }
    }
}
