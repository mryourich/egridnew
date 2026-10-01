"use client";

import { Printer, X } from "lucide-react";
import type { ReactNode } from "react";
import { fmt, today } from "@/lib/date";
import { useStore } from "@/lib/store";

/** A4 document frame with letterhead and a print toolbar (hidden when printing). */
export function DocFrame({ title, meta, children }: { title: string; meta: ReactNode; children: ReactNode }) {
  return (
    <DocScreen>
      <DocPage title={title} meta={meta}>
        {children}
      </DocPage>
    </DocScreen>
  );
}

/** Print toolbar around one or more pages. */
export function DocScreen({ children }: { children: ReactNode }) {
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
      {children}
    </div>
  );
}

/** One A4 page with letterhead; a custom logo replaces the VYSNER logo. */
export function DocPage({ title, meta, children, logo }: { title: string; meta: ReactNode; children: ReactNode; logo?: string }) {
  const { data } = useStore();
  return (
    <article className="doc">
      <header className="doc-head">
        <div>
          <img src={logo || "/brand/vysner-logo.png"} alt={logo ? data.company.name : "VYSNER"} className="doc-logo" />
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
        <span>Erstellt mit VYSNER am {fmt(today())}</span>
      </footer>
    </article>
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
