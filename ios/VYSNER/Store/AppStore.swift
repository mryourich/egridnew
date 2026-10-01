import Foundation
import Observation
import UIKit

/// One task of "Meine Aufgaben": an assigned point or defect that is not done yet.
struct MyTask: Identifiable, Hashable {
    enum Kind { case point, issue }
    var id: String
    var kind: Kind
    var title: String
    var projectId: String
    var context: String
    var due: Date?
    var overdue: Bool
}

@MainActor
@Observable
final class AppStore {
    private(set) var data: AppData
    @ObservationIgnored private let repo: LocalRepository

    init() {
        let repo = LocalRepository()
        self.repo = repo
        if let stored = repo.load() {
            data = stored
        } else {
            let fresh = DemoData.make()
            repo.save(fresh)
            data = fresh
        }
        // For automated screenshots: "-demoUser e2" signs in without the picker.
        if let user = UserDefaults.standard.string(forKey: "demoUser"), data.employees.contains(where: { $0.id == user }) {
            data.currentUserId = user
        }
    }

    private func commit() { repo.save(data) }

    // MARK: Users

    var currentUser: Employee? { data.employees.first { $0.id == data.currentUserId } }
    var role: Role { currentUser?.access ?? .monteur }

    func employee(_ id: String) -> Employee? { data.employees.first { $0.id == id } }
    func name(_ id: String) -> String { employee(id)?.name ?? "–" }

    func signIn(_ id: String) {
        data.currentUserId = id
        commit()
    }

    func signOut() {
        data.currentUserId = ""
        commit()
    }

    func resetDemo() {
        repo.reset()
        let user = data.currentUserId
        data = DemoData.make()
        data.currentUserId = user
        commit()
    }

    // MARK: Projects

    /// Admin and office see every project, everybody else only the ones they belong to.
    var myProjects: [Project] {
        let me = data.currentUserId
        return data.projects
            .filter { role.seesAll || $0.isMember(me) || $0.siteManagerId == me }
            .sorted { ($0.status == .abgeschlossen ? 1 : 0, $0.code) < ($1.status == .abgeschlossen ? 1 : 0, $1.code) }
    }

    func project(_ id: String) -> Project? { data.projects.first { $0.id == id } }

    func team(of project: Project) -> [Employee] {
        let ids = Set(project.members + [project.siteManagerId, project.createdBy])
        return data.employees.filter { ids.contains($0.id) && $0.active }.sorted { $0.name < $1.name }
    }

    // MARK: Structure

    func children(of parentId: String, in projectId: String) -> [SiteNode] {
        data.nodes.filter { $0.projectId == projectId && $0.parentId == parentId }.sorted { $0.order < $1.order }
    }

    func node(_ id: String) -> SiteNode? { data.nodes.first { $0.id == id } }

    func hasChildren(_ node: SiteNode) -> Bool { data.nodes.contains { $0.parentId == node.id } }

    /// Points are the leaves of the structure tree.
    func points(of projectId: String) -> [SiteNode] {
        let parents = Set(data.nodes.map(\.parentId))
        return data.nodes.filter { $0.projectId == projectId && !parents.contains($0.id) }
    }

    func points(below node: SiteNode) -> [SiteNode] {
        let kids = children(of: node.id, in: node.projectId)
        if kids.isEmpty { return [node] }
        return kids.flatMap { points(below: $0) }
    }

    func progress(_ projectId: String) -> Double {
        let pts = points(of: projectId)
        guard !pts.isEmpty else { return 0 }
        return Double(pts.filter { $0.status == .erledigt }.count) / Double(pts.count)
    }

    func progress(of node: SiteNode) -> Double {
        let pts = points(below: node)
        guard !pts.isEmpty else { return 0 }
        return Double(pts.filter { $0.status == .erledigt }.count) / Double(pts.count)
    }

    /// "Abschnitt B › Befestigungspunkte prüfen" – path of the parents for context lines.
    func path(of node: SiteNode) -> String {
        var parts: [String] = []
        var cursor = self.node(node.parentId)
        while let c = cursor {
            parts.insert(c.title, at: 0)
            cursor = self.node(c.parentId)
        }
        return parts.joined(separator: " › ")
    }

    func addNode(projectId: String, parentId: String, title: String) {
        let siblings = children(of: parentId, in: projectId)
        let node = SiteNode(id: Self.newId("n"), projectId: projectId, parentId: parentId, title: title,
                            order: (siblings.map(\.order).max() ?? 0) + 1)
        data.nodes.append(node)
        log("hat „\(title)“ angelegt", projectId)
        commit()
    }

    func updateNode(_ node: SiteNode) {
        guard let i = data.nodes.firstIndex(where: { $0.id == node.id }) else { return }
        let before = data.nodes[i]
        data.nodes[i] = node
        if before.status != node.status {
            log("hat „\(node.title)“ auf \(node.status.label) gesetzt", node.projectId)
        }
        commit()
    }

    func setStatus(_ node: SiteNode, _ status: NodeStatus) {
        var n = node
        n.status = status
        updateNode(n)
    }

    func deleteNode(_ node: SiteNode) {
        var ids: Set<String> = [node.id]
        var grew = true
        while grew {
            let more = data.nodes.filter { ids.contains($0.parentId) && !ids.contains($0.id) }.map(\.id)
            grew = !more.isEmpty
            ids.formUnion(more)
        }
        data.nodes.removeAll { ids.contains($0.id) }
        for i in data.issues.indices where ids.contains(data.issues[i].nodeId) { data.issues[i].nodeId = "" }
        log("hat „\(node.title)“ gelöscht", node.projectId)
        commit()
    }

    // MARK: Issues

    func issues(of projectId: String) -> [Issue] {
        data.issues.filter { $0.projectId == projectId }
            .sorted { ($0.status == .erledigt ? 1 : 0, $0.severity.rank, $0.createdAt) < ($1.status == .erledigt ? 1 : 0, $1.severity.rank, $1.createdAt) }
    }

    func saveIssue(_ issue: Issue) {
        var item = issue
        if let i = data.issues.firstIndex(where: { $0.id == issue.id }) {
            let before = data.issues[i]
            if before.status != .erledigt && item.status == .erledigt {
                item.fixedAt = Date()
                item.fixedBy = data.currentUserId
                log("hat den Mangel „\(item.title)“ behoben", item.projectId)
            }
            data.issues[i] = item
        } else {
            data.issues.append(item)
            log("hat den Mangel „\(item.title)“ erfasst", item.projectId)
        }
        commit()
    }

    func deleteIssue(_ issue: Issue) {
        data.issues.removeAll { $0.id == issue.id }
        [issue.photo, issue.fixPhoto].compactMap { $0 }.forEach(repo.deletePhoto)
        commit()
    }

    func newIssue(projectId: String, nodeId: String = "") -> Issue {
        Issue(id: Self.newId("i"), projectId: projectId, title: "", createdAt: Date(), createdBy: data.currentUserId, nodeId: nodeId)
    }

    // MARK: Photos

    func photos(of projectId: String) -> [Photo] {
        data.photos.filter { $0.projectId == projectId }.sorted { $0.takenAt > $1.takenAt }
    }

    func storeImage(_ image: UIImage) -> String? { repo.storePhoto(image) }
    func image(_ name: String) -> UIImage? { repo.image(for: name) }
    func discardImage(_ name: String) { repo.deletePhoto(name) }

    func addPhoto(_ image: UIImage, projectId: String, nodeId: String = "", caption: String = "") {
        guard let file = repo.storePhoto(image) else { return }
        data.photos.append(Photo(id: Self.newId("ph"), projectId: projectId, nodeId: nodeId, file: file,
                                 caption: caption, takenAt: Date(), authorId: data.currentUserId))
        log("hat ein Foto hinzugefügt", projectId)
        commit()
    }

    func deletePhoto(_ photo: Photo) {
        data.photos.removeAll { $0.id == photo.id }
        repo.deletePhoto(photo.file)
        commit()
    }

    // MARK: Tasks

    var myTasks: [MyTask] {
        let me = data.currentUserId
        let today = Calendar.current.startOfDay(for: Date())
        let projectIds = Set(myProjects.map(\.id))
        let parents = Set(data.nodes.map(\.parentId))
        var tasks: [MyTask] = data.nodes
            .filter { $0.assigneeId == me && $0.status != .erledigt && !parents.contains($0.id) && projectIds.contains($0.projectId) }
            .map { n in
                MyTask(id: n.id, kind: .point, title: n.title, projectId: n.projectId, context: path(of: n),
                       due: n.due, overdue: (n.due.map { $0 < today }) ?? false)
            }
        tasks += data.issues
            .filter { $0.assigneeId == me && $0.status != .erledigt && projectIds.contains($0.projectId) }
            .map { i in
                MyTask(id: i.id, kind: .issue, title: i.title, projectId: i.projectId,
                       context: i.location.isEmpty ? "Mangel · \(i.severity.label)" : "Mangel · \(i.location)",
                       due: i.due, overdue: (i.due.map { $0 < today }) ?? false)
            }
        return tasks.sorted { ($0.overdue ? 0 : 1, $0.due ?? .distantFuture) < ($1.overdue ? 0 : 1, $1.due ?? .distantFuture) }
    }

    func complete(_ task: MyTask) {
        switch task.kind {
        case .point:
            if let n = node(task.id) { setStatus(n, .erledigt) }
        case .issue:
            if var i = data.issues.first(where: { $0.id == task.id }) {
                i.status = .erledigt
                saveIssue(i)
            }
        }
    }

    // MARK: Activity

    func activity(of projectId: String? = nil) -> [Activity] {
        let ids = Set(myProjects.map(\.id))
        return data.activity
            .filter { projectId == nil ? ids.contains($0.projectId) : $0.projectId == projectId }
            .sorted { $0.at > $1.at }
    }

    private func log(_ text: String, _ projectId: String) {
        data.activity.append(Activity(id: Self.newId("a"), at: Date(), by: data.currentUserId, text: text, projectId: projectId))
        if data.activity.count > 300 { data.activity.removeFirst(data.activity.count - 300) }
    }

    static func newId(_ prefix: String) -> String {
        prefix + UUID().uuidString.prefix(8).lowercased()
    }
}
