import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <section className="stack">
      <div className="section-head-row mb-4">
        <div className="row" style={{ gap: "0.75rem" }}>
          <Settings className="w-6 h-6 text-primary" />
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Settings</h1>
        </div>
      </div>

      <section className="card">
        <p className="muted">
          This page is ready for settings modules like tax, receipt footer text, and user access.
        </p>
      </section>
    </section>
  );
}
