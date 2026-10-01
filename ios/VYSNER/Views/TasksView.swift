import SwiftUI

struct TasksView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            let tasks = store.myTasks
            List {
                if tasks.isEmpty {
                    EmptyHint(icon: "checkmark.seal", text: "Dir ist gerade nichts zugewiesen.")
                        .listRowBackground(Color.clear)
                }
                let overdue = tasks.filter(\.overdue)
                if !overdue.isEmpty {
                    Section("Überfällig") {
                        ForEach(overdue) { TaskRow(task: $0) }
                    }
                }
                let points = tasks.filter { !$0.overdue && $0.kind == .point }
                if !points.isEmpty {
                    Section("Punkte") {
                        ForEach(points) { TaskRow(task: $0) }
                    }
                }
                let issues = tasks.filter { !$0.overdue && $0.kind == .issue }
                if !issues.isEmpty {
                    Section("Mängel") {
                        ForEach(issues) { TaskRow(task: $0) }
                    }
                }
            }
            .navigationTitle("Meine Aufgaben")
            .projectDestinations()
        }
    }
}
