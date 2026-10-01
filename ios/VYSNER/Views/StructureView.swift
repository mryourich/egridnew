import SwiftUI

/// Areas and points of a site as a collapsible tree. Points are ticked off right in the list.
struct StructureView: View {
    @Environment(AppStore.self) private var store
    let project: Project
    @State private var collapsed: Set<String> = []
    @State private var editing: SiteNode?
    @State private var adding: AddTarget?
    @State private var newIssue: Issue?
    @State private var filterMine = false

    struct AddTarget: Identifiable {
        let parentId: String
        let label: String
        var id: String { parentId }
    }

    private struct Row: Identifiable {
        let node: SiteNode
        let depth: Int
        let isArea: Bool
        var id: String { node.id }
    }

    private var rows: [Row] {
        var out: [Row] = []
        let me = store.data.currentUserId
        func walk(_ parent: String, _ depth: Int) {
            for n in store.children(of: parent, in: project.id) {
                let isArea = store.hasChildren(n)
                if filterMine && !store.points(below: n).contains(where: { $0.assigneeId == me }) && n.assigneeId != me { continue }
                out.append(Row(node: n, depth: depth, isArea: isArea))
                if isArea && !collapsed.contains(n.id) { walk(n.id, depth + 1) }
            }
        }
        walk("", 0)
        return out
    }

    var body: some View {
        List {
            Section {
                Toggle("Nur meine Punkte", isOn: $filterMine)
            }
            Section {
                if rows.isEmpty {
                    EmptyHint(icon: "square.grid.2x2", text: store.role.isManager ? "Noch keine Struktur. Lege mit + den ersten Bereich an." : "Noch keine Struktur angelegt.")
                }
                ForEach(rows) { row in
                    NodeRow(node: row.node, depth: row.depth, isArea: row.isArea, collapsed: collapsed.contains(row.node.id)) {
                        if collapsed.contains(row.node.id) { collapsed.remove(row.node.id) } else { collapsed.insert(row.node.id) }
                    } onOpen: {
                        editing = row.node
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        if !row.isArea && row.node.status != .erledigt {
                            Button { store.setStatus(row.node, .erledigt) } label: { Label("Erledigt", systemImage: "checkmark") }
                                .tint(Theme.green)
                        }
                        Button { newIssue = store.newIssue(projectId: project.id, nodeId: row.node.id) } label: {
                            Label("Mangel", systemImage: "exclamationmark.triangle")
                        }
                        .tint(Theme.amber)
                    }
                    .swipeActions(edge: .leading) {
                        if store.role.isManager {
                            Button { adding = AddTarget(parentId: row.node.id, label: "Unterpunkt in „\(row.node.title)“") } label: {
                                Label("Unterpunkt", systemImage: "plus")
                            }
                            .tint(Theme.primary)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .toolbar {
            if store.role.isManager {
                ToolbarItem(placement: .primaryAction) {
                    Button { adding = AddTarget(parentId: "", label: "Neuer Bereich") } label: { Image(systemName: "plus") }
                        .accessibilityLabel("Bereich anlegen")
                }
            }
        }
        .sheet(item: $editing) { node in
            NodeEditor(node: node)
        }
        .sheet(item: $newIssue) { issue in
            IssueEditor(issue: issue, isNew: true)
        }
        .sheet(item: $adding) { target in
            AddNodeSheet(label: target.label) { title in
                store.addNode(projectId: project.id, parentId: target.parentId, title: title)
            }
            .presentationDetents([.height(210)])
        }
    }
}

private struct AddNodeSheet: View {
    @Environment(\.dismiss) private var dismiss
    let label: String
    let onSave: (String) -> Void
    @State private var title = ""
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            Form {
                TextField("Bezeichnung", text: $title)
                    .focused($focused)
                    .submitLabel(.done)
                    .onSubmit(save)
            }
            .navigationTitle(label)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Anlegen", action: save).bold()
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear { focused = true }
        }
    }

    private func save() {
        let clean = title.trimmingCharacters(in: .whitespaces)
        guard !clean.isEmpty else { return }
        onSave(clean)
        dismiss()
    }
}

private struct NodeRow: View {
    @Environment(AppStore.self) private var store
    let node: SiteNode
    let depth: Int
    let isArea: Bool
    let collapsed: Bool
    let onToggle: () -> Void
    let onOpen: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            if isArea {
                Button(action: onToggle) {
                    Image(systemName: collapsed ? "chevron.right" : "chevron.down")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                        .frame(width: 22, height: 22)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(collapsed ? "Aufklappen" : "Zuklappen")
            } else {
                Button {
                    withAnimation { store.setStatus(node, node.status.next) }
                } label: {
                    Image(systemName: node.status.icon)
                        .font(.title3)
                        .foregroundStyle(node.status.color)
                        .frame(width: 22, height: 22)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Status: \(node.status.label)")
            }

            Button(action: onOpen) {
                HStack(spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(node.title)
                            .font(isArea ? .subheadline.weight(.semibold) : .subheadline)
                            .foregroundStyle(.primary)
                            .strikethrough(!isArea && node.status == .erledigt, color: .secondary)
                            .multilineTextAlignment(.leading)
                        HStack(spacing: 6) {
                            if isArea {
                                let pts = store.points(below: node)
                                Text("\(pts.filter { $0.status == .erledigt }.count)/\(pts.count) erledigt")
                            } else {
                                Text(node.status.label).foregroundStyle(node.status.color)
                            }
                            if let due = node.due, node.status != .erledigt {
                                Text("· \(due.dayLabel)")
                                    .foregroundStyle(due < Calendar.current.startOfDay(for: Date()) ? Theme.red : .secondary)
                            }
                            let issues = store.data.issues.filter { $0.nodeId == node.id && $0.status != .erledigt }.count
                            if issues > 0 {
                                Label("\(issues)", systemImage: "exclamationmark.triangle.fill").foregroundStyle(Theme.amber)
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 4)
                    if isArea {
                        ProgressRing(value: store.progress(of: node), size: 32, line: 3.5)
                    } else if !node.assigneeId.isEmpty {
                        Avatar(employee: store.employee(node.assigneeId), size: 26)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(.leading, CGFloat(depth) * 16)
    }
}

/// Details of an area or point: title, note, status, who, until when – plus defects and photos of it.
struct NodeEditor: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State var node: SiteNode
    @State private var hasDue: Bool
    @State private var confirmDelete = false
    @State private var newIssue: Issue?
    @State private var openIssue: Issue?
    @State private var pickPhoto = false

    init(node: SiteNode) {
        _node = State(initialValue: node)
        _hasDue = State(initialValue: node.due != nil)
    }

    var body: some View {
        let canEdit = store.role.isManager
        let project = store.project(node.projectId)
        NavigationStack {
            Form {
                Section {
                    TextField("Bezeichnung", text: $node.title).disabled(!canEdit)
                    TextField("Beschreibung", text: $node.description, axis: .vertical).lineLimit(2...6).disabled(!canEdit)
                    if !store.path(of: node).isEmpty {
                        LabeledContent("Liegt in", value: store.path(of: node)).font(.subheadline)
                    }
                }
                Section {
                    Picker("Status", selection: $node.status) {
                        ForEach(NodeStatus.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    Picker("Zuständig", selection: $node.assigneeId) {
                        Text("Niemand").tag("")
                        ForEach(project.map { store.team(of: $0) } ?? []) { Text($0.name).tag($0.id) }
                    }
                    .disabled(!canEdit)
                    Toggle("Fällig am", isOn: $hasDue.animation()).disabled(!canEdit)
                    if hasDue {
                        DatePicker("Datum", selection: Binding(get: { node.due ?? Date() }, set: { node.due = $0 }), displayedComponents: .date)
                            .environment(\.locale, Locale(identifier: "de_AT"))
                            .disabled(!canEdit)
                    }
                }
                Section("Mängel") {
                    let issues = store.data.issues.filter { $0.nodeId == node.id }
                    ForEach(issues) { issue in
                        Button { openIssue = issue } label: { IssueRow(issue: issue) }.buttonStyle(.plain)
                    }
                    Button {
                        newIssue = store.newIssue(projectId: node.projectId, nodeId: node.id)
                    } label: {
                        Label("Mangel erfassen", systemImage: "exclamationmark.triangle")
                    }
                }
                Section("Fotos") {
                    let photos = store.data.photos.filter { $0.nodeId == node.id }
                    if !photos.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(photos) { p in
                                    StoredImage(name: p.file)
                                        .frame(width: 84, height: 84)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                }
                            }
                        }
                    }
                    Button { pickPhoto = true } label: { Label("Foto hinzufügen", systemImage: "camera") }
                }
                if canEdit {
                    Section {
                        Button("Löschen", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .navigationTitle(store.hasChildren(node) ? "Bereich" : "Punkt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Sichern") {
                        var n = node
                        if !hasDue { n.due = nil } else if n.due == nil { n.due = Calendar.current.startOfDay(for: Date()) }
                        n.title = n.title.trimmingCharacters(in: .whitespaces)
                        if !n.title.isEmpty { store.updateNode(n) }
                        dismiss()
                    }
                    .bold()
                }
            }
            .confirmationDialog("„\(node.title)“ mit allen Unterpunkten löschen?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Löschen", role: .destructive) {
                    store.deleteNode(node)
                    dismiss()
                }
            }
            .sheet(item: $newIssue) { IssueEditor(issue: $0, isNew: true) }
            .sheet(item: $openIssue) { IssueEditor(issue: $0, isNew: false) }
            .photoSource(isPresented: $pickPhoto) { image in
                store.addPhoto(image, projectId: node.projectId, nodeId: node.id, caption: node.title)
            }
        }
    }
}
