"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Editor, type EditorTarget } from "./editors";

/** Opens the entry dialogs (defects, reports, points …) from anywhere inside the app. */
const EditorContext = createContext<(target: EditorTarget) => void>(() => {});

export function useEditor() {
  return useContext(EditorContext);
}

export function EditorHost({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<EditorTarget | null>(null);
  return (
    <EditorContext.Provider value={setTarget}>
      {children}
      {target && <Editor target={target} onClose={() => setTarget(null)} />}
    </EditorContext.Provider>
  );
}
