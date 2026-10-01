import SwiftUI

/// Until the server login comes, people pick who they are from the demo company.
struct LoginView: View {
    @Environment(AppStore.self) private var store

    private struct Group: Identifiable {
        let role: Role
        let people: [Employee]
        var id: Role { role }
    }

    private var groups: [Group] {
        Role.allCases.compactMap { role in
            let people = store.data.employees.filter { $0.access == role && $0.active }
            return people.isEmpty ? nil : Group(role: role, people: people)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(spacing: 14) {
                        Image("BrandMark").resizable().scaledToFit().frame(height: 64)
                        Image("BrandWord").resizable().scaledToFit().frame(height: 18)
                        Text("Baustellen im Griff – Struktur, Mängel und Fotos direkt vor Ort.")
                            .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .listRowBackground(Color.clear)
                }
                ForEach(groups) { group in
                    Section(group.role.label) {
                        ForEach(group.people) { person in
                            Button {
                                store.signIn(person.id)
                            } label: {
                                HStack(spacing: 12) {
                                    Avatar(employee: person, size: 36)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(person.name).foregroundStyle(.primary)
                                        Text(person.role).font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                                }
                            }
                        }
                    }
                }
                Section {
                    Text("Demo-Firma \(store.data.company.name). Die Anmeldung mit eigenem Konto folgt mit dem Server-Abgleich.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Anmelden als")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
