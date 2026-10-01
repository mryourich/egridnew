import Foundation

/// Same demo company as vysner.com, so the app looks familiar right away.
enum DemoData {
    static func make() -> AppData {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        func d(_ days: Int) -> Date { cal.date(byAdding: .day, value: days, to: today) ?? today }

        func e(_ id: String, _ name: String, _ role: String, _ access: Role, _ team: String, _ phone: String) -> Employee {
            let mail = name.split(separator: " ").first.map { $0.lowercased() } ?? id
            return Employee(id: id, name: name, role: role, access: access, team: team, phone: phone, email: "\(mail)@example.at")
        }
        let employees = [
            e("e19", "Gerhard Lindner", "Geschäftsführer", .admin, "Geschäftsführung", "+43 660 9900112"),
            e("e9", "Petra Koller", "Projektleiterin", .pl, "Projektleitung", "+43 660 9012345"),
            e("e1", "Mario Juric", "Bauleiter", .bl, "Bauleitung", "+43 660 1234567"),
            e("e2", "Anna Berger", "Bauleiterin", .bl, "Bauleitung", "+43 660 2345678"),
            e("e10", "Markus Brandl", "Bauleiter", .bl, "Bauleitung", "+43 660 1122334"),
            e("e17", "Thomas Ebner", "Montagekoordinator", .mk, "Koordination", "+43 660 5566778"),
            e("e18", "Claudia Fink", "Büro / Lohnverrechnung", .buero, "Büro", "+43 660 7788990"),
            e("e3", "Lukas Hofer", "Elektrotechniker", .monteur, "Montage A", "+43 660 3456789"),
            e("e4", "Stefan Maier", "Monteur", .monteur, "Montage A", "+43 660 4567890"),
            e("e5", "Julia Wimmer", "Elektrotechnikerin", .monteur, "Montage B", "+43 660 5678901"),
            e("e6", "Thomas Gruber", "Monteur", .monteur, "Montage B", "+43 660 6789012"),
            e("e7", "Daniel Huber", "Lehrling", .monteur, "Montage B", "+43 660 7890123"),
            e("e8", "Sabine Leitner", "Kabelzieherin", .monteur, "Montage A", "+43 660 8901234"),
            e("e11", "Ivan Kovac", "Inbetriebnehmer", .monteur, "Inbetriebnahme", "+43 660 2233445"),
            e("e12", "Marko Petrovic", "Servicetechniker", .monteur, "Inbetriebnahme", "+43 660 3344556"),
        ]

        let projects = [
            Project(id: "p1", code: "P-2401", name: "Umspannwerk Nord – Erweiterung", client: "Energie AG", location: "Linz",
                    status: .aktiv, colorHex: "#1463ff", start: d(-21), end: d(45), siteManagerId: "e10", createdBy: "e10",
                    members: ["e1", "e3", "e4", "e11", "e9", "e17"], imageName: "Band",
                    description: "Erweiterung um zwei 110-kV-Felder inkl. Sekundärtechnik."),
            Project(id: "p2", code: "P-2402", name: "Tunnel Nord – Elektroinstallation", client: "ASFINAG", location: "Vöcklabruck",
                    status: .aktiv, colorHex: "#00b4d8", start: d(-35), end: d(30), siteManagerId: "e2", createdBy: "e2",
                    members: ["e4", "e6", "e8", "e12", "e1", "e9", "e17"], imageName: "Tunnel",
                    description: "Kabeltrassen, Beleuchtung und Notstromversorgung Abschnitt A–C."),
            Project(id: "p3", code: "P-2403", name: "Parkdeck Ladepunkte", client: "Stadtwerke Wels", location: "Wels",
                    status: .aktiv, colorHex: "#7c3aed", start: d(-7), end: d(24), siteManagerId: "e1", createdBy: "e1",
                    members: ["e5", "e6", "e7", "e11", "e12", "e2", "e9"], imageName: "Foto5",
                    description: "24 AC-Ladepunkte, 4 DC-Schnelllader, Lastmanagement."),
            Project(id: "p4", code: "P-2404", name: "Schaltanlage Werk 3", client: "Voest Industrie", location: "Steyr",
                    status: .planung, colorHex: "#f59e0b", start: d(14), end: d(70), siteManagerId: "e10", createdBy: "e10",
                    members: ["e9", "e3", "e4"], imageName: nil,
                    description: "Neubau NS-Hauptverteilung inkl. Kompensation."),
        ]

        var order = 0.0
        func n(_ id: String, _ p: String, _ parent: String, _ title: String, _ status: NodeStatus, _ who: String,
               _ due: Date? = nil, _ text: String = "") -> SiteNode {
            order += 1
            return SiteNode(id: id, projectId: p, parentId: parent, title: title, description: text, status: status,
                            assigneeId: who, due: due, order: order)
        }
        let nodes = [
            n("n1", "p2", "", "Elektroinstallation Tunnelabschnitt Nord", .in_arbeit, "e2", nil, "Kabelwege, Verteiler und Erstprüfung."),
            n("n2", "p2", "n1", "Kabeltrassen Ebene 2", .in_arbeit, "e8", d(6), "Montage und Dokumentation der Trassen im Technikbereich."),
            n("n3", "p2", "n2", "Abschnitt A – Hauptachse", .erledigt, "e6"),
            n("n4", "p2", "n3", "Konsolen setzen", .erledigt, "e6"),
            n("n5", "p2", "n3", "Trasse montieren", .erledigt, "e6"),
            n("n6", "p2", "n2", "Abschnitt B – Querverbindung", .in_arbeit, "e8", d(4), "Abstimmung mit Bauleitung und Fotodokumentation erforderlich."),
            n("n7", "p2", "n6", "Befestigungspunkte prüfen", .offen, "e8", d(2), "Alle Konsolen auf festen Sitz prüfen."),
            n("n8", "p2", "n6", "Durchgangsöffnung abdichten", .in_arbeit, "e4", d(3)),
            n("n9", "p2", "n6", "Fotodokumentation hochladen", .offen, "e8", d(4)),
            n("n10", "p2", "n1", "Verteiler E2", .offen, "e4", d(12)),
            n("n11", "p2", "n10", "Verteiler setzen", .offen, "e4"),
            n("n12", "p2", "n10", "Prüfprotokoll anhängen", .offen, "e2", d(5)),
            n("n13", "p2", "", "Beleuchtung", .offen, "e4", d(24)),
            n("n14", "p2", "n13", "Leuchten Abschnitt A", .offen, "e4"),
            n("n15", "p2", "n13", "Notbeleuchtung", .offen, "e4"),
            n("n16", "p1", "", "Feld 1 – 110 kV", .in_arbeit, "e3", d(9)),
            n("n17", "p1", "n16", "Leistungsschalter setzen", .erledigt, "e3"),
            n("n18", "p1", "n16", "Erdung anschließen", .erledigt, "e4"),
            n("n19", "p1", "n16", "Sekundärverdrahtung", .in_arbeit, "e3", d(9)),
            n("n20", "p1", "", "Feld 2 – 110 kV", .offen, "e3", d(20)),
            n("n21", "p1", "n20", "Erdungsanschluss", .offen, "e3", d(-1)),
            n("n22", "p1", "n20", "Wandler montieren", .offen, "e4", d(15)),
            n("n23", "p3", "", "Parkdeck Ebene 1", .in_arbeit, "e5", d(11)),
            n("n24", "p3", "n23", "Unterverteilung UV-P1", .erledigt, "e5"),
            n("n25", "p3", "n23", "Wallboxen Reihe 1–4", .in_arbeit, "e5", d(8)),
            n("n26", "p3", "n23", "Kabelbefestigung montieren", .offen, "e7", d(6)),
            n("n27", "p3", "", "Parkdeck Ebene 2", .offen, "e5", d(20)),
            n("n28", "p3", "n27", "Zählerschrank Reihe 4", .offen, "e5", d(18)),
        ]

        let issues = [
            Issue(id: "i1", projectId: "p2", title: "Befestigung Kabeltrasse lose",
                  description: "Abschnitt B, km 1,2 – zwei Konsolen nicht fest verschraubt.", location: "Abschnitt B / km 1,2",
                  severity: .hoch, status: .offen, assigneeId: "e8", due: d(2), createdAt: d(-2), createdBy: "e2",
                  nodeId: "n7", photo: "asset:Foto3"),
            Issue(id: "i2", projectId: "p2", title: "Zufahrt gesperrt durch Tiefbau",
                  description: "Fremdfirma blockiert Zufahrt Portal Nord bis voraussichtlich Freitag.", location: "Portal Nord",
                  severity: .mittel, status: .in_arbeit, assigneeId: "e2", due: d(4), createdAt: d(-1), createdBy: "e4",
                  nodeId: "n1"),
            Issue(id: "i3", projectId: "p1", title: "Kabeltyp abweichend geliefert",
                  description: "Geliefert NA2XS2Y statt N2XS2Y – Freigabe durch Planer nötig.", location: "Lager",
                  severity: .mittel, status: .offen, assigneeId: "e1", due: d(3), createdAt: d(-3), createdBy: "e10",
                  nodeId: "n16"),
            Issue(id: "i4", projectId: "p3", title: "Beschriftung Unterverteilung fehlt",
                  description: "UV-P1 und UV-P2 ohne Stromkreisbeschriftung.", location: "Ebene 1",
                  severity: .niedrig, status: .erledigt, assigneeId: "e5", due: d(-1), createdAt: d(-5), createdBy: "e1",
                  nodeId: "n24", fixedAt: d(-1), fixedBy: "e5"),
            Issue(id: "i5", projectId: "p1", title: "Erdungsanschluss Feld 2 fehlt",
                  location: "Feld 2", severity: .kritisch, status: .offen, assigneeId: "e3", due: d(-1), createdAt: d(-4),
                  createdBy: "e10", nodeId: "n21", photo: "asset:Foto2"),
        ]

        let photos = [
            Photo(id: "ph1", projectId: "p2", nodeId: "n5", file: "asset:Tunnel", caption: "Trasse Abschnitt A montiert", takenAt: d(-3), authorId: "e6"),
            Photo(id: "ph2", projectId: "p2", nodeId: "n7", file: "asset:Foto3", caption: "Konsole km 1,2", takenAt: d(-2), authorId: "e8"),
            Photo(id: "ph3", projectId: "p1", nodeId: "n17", file: "asset:Band", caption: "Feld 1 Übersicht", takenAt: d(-5), authorId: "e3"),
            Photo(id: "ph4", projectId: "p1", nodeId: "n21", file: "asset:Foto2", caption: "Erdung Feld 2", takenAt: d(-4), authorId: "e10"),
            Photo(id: "ph5", projectId: "p3", nodeId: "n25", file: "asset:Foto5", caption: "Wallboxen Reihe 1", takenAt: d(-1), authorId: "e5"),
            Photo(id: "ph6", projectId: "p3", nodeId: "n24", file: "asset:Foto1", caption: "UV-P1", takenAt: d(-2), authorId: "e5"),
        ]

        let now = Date()
        func a(_ minutes: Int, _ by: String, _ text: String, _ p: String) -> Activity {
            Activity(id: "a\(minutes)", at: now.addingTimeInterval(TimeInterval(-minutes * 60)), by: by, text: text, projectId: p)
        }
        let activity = [
            a(25, "e8", "hat ein Foto hinzugefügt", "p2"),
            a(70, "e6", "hat „Trasse montieren“ auf Erledigt gesetzt", "p2"),
            a(180, "e5", "hat „Wallboxen Reihe 1–4“ auf In Arbeit gesetzt", "p3"),
            a(300, "e10", "hat den Mangel „Erdungsanschluss Feld 2 fehlt“ erfasst", "p1"),
            a(1500, "e2", "hat den Mangel „Befestigung Kabeltrasse lose“ erfasst", "p2"),
        ]

        return AppData(company: Company(name: "Elektro Muster GmbH", address: "Industriestraße 12, 4020 Linz"),
                       currentUserId: "", employees: employees, projects: projects, nodes: nodes,
                       issues: issues, photos: photos, activity: activity)
    }
}
