"use client";

import { Printer, X } from "lucide-react";
import type { ReactNode } from "react";
import { fmt, today } from "@/lib/date";
import { useStore } from "@/lib/store";

/** A4 document frame with letterhead and a print toolbar (hidden when printing). */
export function DocFrame({ title, meta, children }: { title: string; meta: ReactNode; children: ReactNode }) {
  const { data } = useStore();
  return (
    <div className="doc-screen">
      <div className="doc-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={15} /> Drucken / als PDF speichern
        </button>
        <button type="button" className="btn" onClick={() => window.close()}>
          <X size={15} /> Schließen
        </button>
      </div>
      <article className="doc">
        <header className="doc-head">
          <div>
            <img src="/brand/vysnertech.png" alt="VYSNERTECH" className="doc-logo" />
            <p className="doc-company">
              {data.company.name}
              <br />
              {data.company.address}
            </p>
          </div>
          <div className="doc-title">
            <h1>{title}</h1>
            {meta}
          </div>
        </header>
        {children}
        <footer className="doc-foot">
          <span>{data.company.name}</span>
          <span>Erstellt mit VYSNERTECH am {fmt(today())}</span>
        </footer>
      </article>
    </div>
  );
}

export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="doc-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
