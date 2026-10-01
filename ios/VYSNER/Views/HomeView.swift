import SwiftUI

struct ProjectRoute: Hashable {
    let projectId: String
    var section: ProjectSection = .uebersicht
}

extension View {
    /// Every tab can open projects the same way.
    func projectDestinations() -> some View {
        navigationDestination(for: ProjectRoute.self) { route in
            ProjectDetailView(projectId: route.projectId, initial: route.section)
        }
    }
}

struct HomeView: View {
    @Environment(AppStore.self) private var store

    private var greeting: String {
        let h = Calendar.current.component(.hour, from: Date())
        let first = store.currentUser?.firstName ?? ""
        switch h {
        case 5..<11: return "Guten Morgen, \(first)"
        case 11..<18: return "Hallo, \(first)"
        default: return "Guten Abend, \(first)"
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    kpis
                    tasks
                    projects
                    activity
                }
                .padding(16)
            }
            .background(Theme.page)
            .navigationTitle("Start")
            .toolbar(.hidden, for: .navigationBar)
            .projectDestinations()
        }
    }

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                Text(Date().formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "de_AT"))))
                    .font(.subheadline).foregroundStyle(.secondary)
                Text(greeting).font(.title2.bold())
            }
            Spacer()
            Avatar(employee: store.currentUser, size: 42)
        }
        .padding(.top, 8)
    }

    private var kpis: some View {
        let projects = store.myProjects
        let ids = Set(projects.map(\.id))
        let openIssues = store.data.issues.filter { ids.contains($0.projectId) && $0.status != .erledigt }
        let tasks = store.myTasks
        return LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            Kpi(title: "Meine Aufgaben", value: "\(tasks.count)", icon: "checklist", color: Theme.primary)
            Kpi(title: "Überfällig", value: "\(tasks.filter(\.overdue).count)", icon: "exclamationmark.triangle", color: Theme.red)
            Kpi(title: "Offene Mängel", value: "\(openIssues.count)", icon: "wrench.and.screwdriver", color: Theme.amber)
            Kpi(title: "Aktive Projekte", value: "\(projects.filter { $0.status == .aktiv }.count)", icon: "building.2", color: Theme.cyan)
        }
    }

    private var tasks: some View {
        let list = store.myTasks
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle(title: "Meine Aufgaben", trailing: list.isEmpty ? nil : "\(list.count) offen")
            VStack(spacing: 0) {
                if list.isEmpty {
                    EmptyHint(icon: "checkmark.seal", text: "Nichts offen – alles erledigt.")
                } else {
                    ForEach(list.prefix(5)) { task in
                        TaskRow(task: task)
                        if task.id != list.prefix(5).last?.id { Divider().padding(.leading, 48) }
                    }
                }
            }
            .padding(.horizontal, 12)
            .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
        }
    }

    private var projects: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionTitle(title: "Meine Projekte")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(store.myProjects) { p in
                        NavigationLink(value: ProjectRoute(projectId: p.id)) {
                            ProjectCard(project: p).frame(width: 250)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var activity: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionTitle(title: "Letzte Aktivität")
            VStack(alignment: .leading, spacing: 12) {
                let items = store.activity().prefix(6)
                if items.isEmpty {
                    EmptyHint(icon: "clock", text: "Noch keine Aktivität.")
                }
                ForEach(Array(items)) { a in
                    HStack(alignment: .top, spacing: 10) {
                        Avatar(employee: store.employee(a.by), size: 28)
                        VStack(alignment: .leading, spacing: 2) {
                            (Text(store.name(a.by)).bold() + Text(" " + a.text))
                                .font(.subheadline)
                            Text("\(store.project(a.projectId)?.code ?? "") · \(a.at.relativeLabel)")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
        }
    }
}

struct Kpi: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(color)
                .frame(width: 30, height: 30)
                .background(RoundedRectangle(cornerRadius: 8).fill(color.opacity(0.12)))
            Text(value).font(.title.bold())
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
    }
}

struct ProjectCard: View {
    @Environment(AppStore.self) private var store
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ProjectImage(project: project)
                .frame(height: 110)
                .frame(maxWidth: .infinity)
                .clipped()
            VStack(alignment: .leading, spacing: 6) {
                Text(project.code).font(.caption.weight(.semibold)).foregroundStyle(Color(hex: project.colorHex))
                Text(project.name).font(.subheadline.weight(.semibold)).lineLimit(2, reservesSpace: true)
                HStack {
                    Label(project.location, systemImage: "mappin.and.ellipse").font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    Text("\(Int((store.progress(project.id) * 100).rounded()))%").font(.caption.bold())
                }
                ProgressView(value: store.progress(project.id)).tint(Color(hex: project.colorHex))
            }
            .padding(12)
        }
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

/// Assigned point or defect with a check box to finish it.
struct TaskRow: View {
    @Environment(AppStore.self) private var store
    let task: MyTask

    var body: some View {
        HStack(spacing: 12) {
            Button {
                withAnimation { store.complete(task) }
            } label: {
                Image(systemName: "circle").font(.title3).foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Erledigt")

            NavigationLink(value: ProjectRoute(projectId: task.projectId, section: task.kind == .issue ? .maengel : .struktur)) {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Image(systemName: task.kind == .issue ? "exclamationmark.triangle.fill" : "square.grid.2x2")
                                .font(.caption2)
                                .foregroundStyle(task.kind == .issue ? Theme.amber : Theme.primary)
                            Text(task.title).font(.subheadline.weight(.medium)).foregroundStyle(.primary).lineLimit(1)
                        }
                        Text("\(store.project(task.projectId)?.code ?? "") · \(task.context)")
                            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    Spacer(minLength: 6)
                    if let due = task.due {
                        Text(due.dayLabel)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(task.overdue ? Theme.red : .secondary)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 10)
    }
}
