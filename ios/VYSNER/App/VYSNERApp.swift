import SwiftUI

@main
struct VYSNERApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .tint(Theme.primary)
        }
    }
}

struct RootView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        if store.currentUser == nil {
            LoginView()
        } else {
            MainTabs()
        }
    }
}

struct MainTabs: View {
    @Environment(AppStore.self) private var store
    @State private var tab = UserDefaults.standard.string(forKey: "startTab") ?? "start"

    var body: some View {
        TabView(selection: $tab) {
            HomeView()
                .tabItem { Label("Start", systemImage: "house") }
                .tag("start")
            TasksView()
                .tabItem { Label("Aufgaben", systemImage: "checklist") }
                .badge(store.myTasks.count)
                .tag("aufgaben")
            ProjectsView()
                .tabItem { Label("Projekte", systemImage: "building.2") }
                .tag("projekte")
            SettingsView()
                .tabItem { Label("Mehr", systemImage: "ellipsis.circle") }
                .tag("mehr")
        }
    }
}
