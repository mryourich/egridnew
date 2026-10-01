import SwiftUI

struct PhotosView: View {
    @Environment(AppStore.self) private var store
    let project: Project
    @State private var picking = false
    @State private var viewing: Photo?

    private let columns = [GridItem(.adaptive(minimum: 104), spacing: 4)]

    var body: some View {
        let photos = store.photos(of: project.id)
        ScrollView {
            if photos.isEmpty {
                EmptyHint(icon: "camera", text: "Noch keine Fotos. Tippe auf die Kamera oben rechts.")
                    .padding(.top, 40)
            }
            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(photos) { photo in
                    Button { viewing = photo } label: {
                        Color.clear
                            .aspectRatio(1, contentMode: .fit)
                            .overlay(StoredImage(name: photo.file))
                            .clipped()
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(4)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { picking = true } label: { Image(systemName: "camera") }
                    .accessibilityLabel("Foto hinzufügen")
            }
        }
        .photoSource(isPresented: $picking) { image in
            store.addPhoto(image, projectId: project.id)
        }
        .fullScreenCover(item: $viewing) { PhotoViewer(photo: $0) }
    }
}

struct PhotoViewer: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let photo: Photo
    @State private var scale: CGFloat = 1
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                if let image = store.image(photo.file) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .scaleEffect(scale)
                        .gesture(MagnifyGesture().onChanged { scale = max(1, $0.magnification) }.onEnded { _ in
                            withAnimation { scale = 1 }
                        })
                }
                VStack {
                    Spacer()
                    VStack(alignment: .leading, spacing: 4) {
                        if !photo.caption.isEmpty { Text(photo.caption).font(.subheadline.weight(.semibold)) }
                        let point = store.node(photo.nodeId)?.title
                        Text([store.name(photo.authorId), photo.takenAt.formatted(date: .abbreviated, time: .shortened), point ?? ""]
                            .filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.caption)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(.black.opacity(0.5))
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }.tint(.white)
                }
                ToolbarItem(placement: .primaryAction) {
                    if let image = store.image(photo.file) {
                        ShareLink(item: Image(uiImage: image), preview: SharePreview(photo.caption.isEmpty ? "Foto" : photo.caption, image: Image(uiImage: image)))
                            .tint(.white)
                    }
                }
                if store.role.isManager || photo.authorId == store.data.currentUserId {
                    ToolbarItem(placement: .destructiveAction) {
                        Button { confirmDelete = true } label: { Image(systemName: "trash") }.tint(.white)
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
            .confirmationDialog("Foto löschen?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Löschen", role: .destructive) {
                    store.deletePhoto(photo)
                    dismiss()
                }
            }
        }
    }
}
