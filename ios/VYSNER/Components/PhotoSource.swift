import PhotosUI
import SwiftUI
import UIKit

extension View {
    /// Asks "Kamera or Fotos", then hands the chosen picture over.
    func photoSource(isPresented: Binding<Bool>, onImage: @escaping (UIImage) -> Void) -> some View {
        modifier(PhotoSourceModifier(isPresented: isPresented, onImage: onImage))
    }
}

private struct PhotoSourceModifier: ViewModifier {
    @Binding var isPresented: Bool
    let onImage: (UIImage) -> Void
    @State private var camera = false
    @State private var library = false
    @State private var item: PhotosPickerItem?

    func body(content: Content) -> some View {
        content
            .confirmationDialog("Foto hinzufügen", isPresented: $isPresented) {
                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    Button("Kamera") { camera = true }
                }
                Button("Aus Fotos wählen") { library = true }
                Button("Abbrechen", role: .cancel) {}
            }
            .fullScreenCover(isPresented: $camera) {
                CameraPicker(onImage: onImage).ignoresSafeArea()
            }
            .photosPicker(isPresented: $library, selection: $item, matching: .images)
            .onChange(of: item) { _, picked in
                guard let picked else { return }
                Task {
                    if let data = try? await picked.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                        onImage(image)
                    }
                    item = nil
                }
            }
    }
}

/// The system camera.
struct CameraPicker: UIViewControllerRepresentable {
    let onImage: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage { parent.onImage(image) }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
