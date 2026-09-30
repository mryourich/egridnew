import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel">
        <Link href="/" className="login-brand">
          <Image src="/brand/egrid-icon.png" width={42} height={42} alt="VYSNpro" priority />
          <span>VYSNpro</span>
        </Link>
        <div className="login-copy">
          <span className="eyebrow">B2B Login</span>
          <h1>Workspace betreten</h1>
        </div>
        <form className="login-form">
          <label>
            <span>E-Mail</span>
            <div>
              <Mail size={17} />
              <input type="email" placeholder="name@firma.at" />
            </div>
          </label>
          <label>
            <span>Passwort</span>
            <div>
              <LockKeyhole size={17} />
              <input type="password" placeholder="Passwort" />
            </div>
          </label>
          <button type="button" className="primary-action login-submit">
            Einloggen <ArrowRight size={17} />
          </button>
        </form>
      </section>
      <aside className="login-side">
        <div>
          <Building2 size={28} />
          <h2>Mandantenfähige SaaS-Basis</h2>
          <p>People, Fleet, Sitemanager und Rollen laufen in einer gemeinsamen Produktstruktur.</p>
        </div>
        <div className="login-side-row">
          <ShieldCheck size={18} />
          EU Cloud · Rollen · Audit-ready
        </div>
      </aside>
    </main>
  );
}
