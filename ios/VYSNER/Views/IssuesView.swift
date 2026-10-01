import SwiftUI

struct IssuesView: View {
    @Environment(AppStore.self) private var store
    let project: Project
    @State private var showAll = false
    @State private var editing: Issue?
    @State private var isNew = false

    var body: some View {
        let all = store.issues(of: project.id)
        let list = showAll ? all : all.filter { $0.status != .erledigt }
        List {
            Section {
                Picker("Anzeigen", selection: $showAll) {
                    Text("Offen (\(all.filter { $0.status != .erledigt }.count))").tag(false)
                    Text("Alle (\(all.count))").tag(true)
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }
            Section {
                if list.isEmpty {
                    EmptyHint(icon: "checkmark.shield", text: showAll ? "Noch keine Mängel erfasst." : "Keine offenen Mängel.")
                }
                ForEach(list) { issue in
                    Button {
                        isNew = false
                        editing = issue
                    } label: {
                        IssueRow(issue: issue)
                    }
                    .buttonStyle(.plain)
                    .swipeActions {
                        if issue.status != .erledigt {
                            Button {
                                var fixed = issue
                                fixed.status = .erledigt
                                store.saveIssue(fixed)
                            } label: { Label("Behoben", systemImage: "checkmark") }
                            .tint(Theme.green)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isNew = true
                    editing = store.newIssue(projectId: project.id)
                } label: { Image(systemName: "plus") }
                .accessibilityLabel("Mangel erfassen")
            }
        }
        .sheet(item: $editing) { IssueEditor(issue: $0, isNew: isNew) }
    }
}

struct IssueRow: View {
    @Environment(AppStore.self) private var store
    let issue: Issue

    var body: some View {
        HStack(spacing: 12) {
            Group {
                if let photo = issue.fixPhoto ?? issue.photo {
                    StoredImage(name: photo)
                } else {
                    ZStack {
                        issue.severity.color.opacity(0.12)
                        Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(issue.severity.color)
                    }
                }
            }
            .frame(width: 54, height: 54)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(issue.title).font(.subheadline.weight(.semibold)).foregroundStyle(.primary).lineLimit(2)
                HStack(spacing: 6) {
                    Chip(text: issue.status.label, color: issue.status.color)
                    Chip(text: issue.severity.label, color: issue.severity.color)
                }
                let meta = [issue.location, issue.assigneeId.isEmpty ? "" : store.name(issue.assigneeId)].filter { !$0.isEmpty }
                if !meta.isEmpty {
                    Text(meta.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            if let due = issue.due, issue.status != .erledigt {
                Text(due.dayLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(due < Calendar.current.startOfDay(for: Date()) ? Theme.red : .secondary)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}

/// Capture or edit a defect: what, where, how bad, who fixes it by when – with photo before and after.
struct IssueEditor: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var issue: Issue
    let isNew: Bool
    @State private var hasDue: Bool
    @State private var slot: PhotoSlot = .before
    @State private var picking = false
    @State private var confirmDelete = false
    /// Pictures taken in this sheet; removed again if the sheet is cancelled.
    @State private var fresh: [String] = []

    enum PhotoSlot { case before, after }

    init(issue: Issue, isNew: Bool) {
        _issue = State(initialValue: issue)
        self.isNew = isNew
        _hasDue = State(initialValue: issue.due != nil)
    }

    var body: some View {
        let project = store.project(issue.projectId)
        let points = store.points(of: issue.projectId).sorted { $0.order < $1.order }
        NavigationStack {
            Form {
                Section {
                    TextField("Was ist das Problem?", text: $issue.title)
                    TextField("Beschreibung", text: $issue.description, axis: .vertical).lineLimit(2...6)
                    TextField("Ort (z. B. Abschnitt B / km 1,2)", text: $issue.location)
                }
                Section("Foto") {
                    photoRow(title: "Vorher", name: issue.photo, slot: .before)
                    if issue.status == .erledigt || issue.fixPhoto != nil {
                        photoRow(title: "Nachher", name: issue.fixPhoto, slot: .after)
                    }
                }
                Section {
                    Picker("Schwere", selection: $issue.severity) {
                        ForEach(Severity.allCases) { Text($0.label).tag($0) }
                    }
                    Picker("Status", selection: $issue.status) {
                        ForEach(IssueStatus.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    Picker("Zuständig", selection: $issue.assigneeId) {
                        Text("Niemand").tag("")
                        ForEach(project.map { store.team(of: $0) } ?? []) { Text($0.name).tag($0.id) }
                    }
                    Picker("Punkt", selection: $issue.nodeId) {
                        Text("Keiner").tag("")
                        ForEach(points) { Text($0.title).tag($0.id) }
                    }
                    Toggle("Frist", isOn: $hasDue.animation())
                    if hasDue {
                        DatePicker("Bis", selection: Binding(get: { issue.due ?? Date() }, set: { issue.due = $0 }), displayedComponents: .date)
                            .environment(\.locale, Locale(identifier: "de_AT"))
                    }
                }
                if !isNew {
                    Section {
                        LabeledContent("Erfasst", value: "\(store.name(issue.createdBy)) · \(issue.createdAt.formatted(date: .abbreviated, time: .omitted))")
                        if let at = issue.fixedAt {
                            LabeledContent("Behoben", value: "\(store.name(issue.fixedBy ?? "")) · \(at.formatted(date: .abbreviated, time: .omitted))")
                        }
                    }
                    .font(.subheadline)
                    if store.role.isManager {
                        Section {
                            Button("Mangel löschen", role: .destructive) { confirmDelete = true }
                        }
                    }
                }
            }
            .navigationTitle(isNew ? "Neuer Mangel" : "Mangel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") {
                        fresh.forEach(store.discardImage)
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Sichern") {
                        var item = issue
                        item.title = item.title.trimmingCharacters(in: .whitespaces)
                        if !hasDue { item.due = nil } else if item.due == nil { item.due = Calendar.current.startOfDay(for: Date()) }
                        store.saveIssue(item)
                        dismiss()
                    }
                    .bold()
                    .disabled(issue.title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .confirmationDialog("Mangel löschen?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Löschen", role: .destructive) {
                    store.deleteIssue(issue)
                    dismiss()
                }
            }
            .photoSource(isPresented: $picking) { image in
                guard let name = store.storeImage(image) else { return }
                fresh.append(name)
                if slot == .after {
                    issue.fixPhoto = name
                    if issue.status != .erledigt { issue.status = .erledigt }
                } else {
                    issue.photo = name
                }
            }
            .interactiveDismissDisabled(!fresh.isEmpty)
        }
    }

    @ViewBuilder
    private func photoRow(title: String, name: String?, slot: PhotoSlot) -> some View {
        HStack(spacing: 12) {
            if let name {
                StoredImage(name: name)
                    .frame(width: 72, height: 72)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(title).font(.subheadline.weight(.semibold))
                Button(name == nil ? "Foto aufnehmen" : "Foto ersetzen") {
                    self.slot = slot
                    picking = true
                }
                    .font(.subheadline)
            }
            Spacer()
        }
    }
}
