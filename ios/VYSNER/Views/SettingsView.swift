import SwiftUI

struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @State private var confirmReset = false

    var body: some View {
        NavigationStack {
            List {
                if let me = store.currentUser {
                    Section {
                        HStack(spacing: 14) {
                            Avatar(employee: me, size: 52)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(me.name).font(.headline)
                                Text("\(me.role) · \(me.access.label)").font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                        LabeledContent("Firma", value: store.data.company.name)
                        LabeledContent("Team", value: me.team)
                    }
                }
                Section("Web-Version") {
                    Link(destination: URL(string: "https://vysner.com")!) {
                        Label("vysner.com öffnen", systemImage: "safari")
                    }
                    Text("Gantt, Pläne, Berichte, Regie und Dokumente gibt es in der Web-Version. Der Abgleich zwischen App und Web kommt mit dem Server.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section("Daten") {
                    LabeledContent("Speicher", value: "Auf diesem Gerät")
                    Button("Demo-Daten zurücksetzen", role: .destructive) { confirmReset = true }
                }
                Section {
                    Button("Abmelden") { store.signOut() }
                }
                Section {
                    HStack {
                        Image("BrandMark").resizable().scaledToFit().frame(height: 22)
                        Text("VYSNER \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Mehr")
            .confirmationDialog("Alle Änderungen auf diesem Gerät verwerfen und die Demo neu laden?", isPresented: $confirmReset, titleVisibility: .visible) {
                Button("Zurücksetzen", role: .destructive) { store.resetDemo() }
            }
        }
    }
}
