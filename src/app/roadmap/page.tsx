import { AppShell } from "@/components/AppShell";
import { SIXTEEN_WEEK_CURRICULUM } from "@/lib/domain/curriculum";
import { Flag } from "lucide-react";

export default function RoadmapPage() {
  return (
    <AppShell
      title="Currículo Intensivo de 16 Semanas (TBLT)"
      subtitle="Organizado por missões comunicativas reais (A1 → A2 → B1). A gramática entra sob demanda como ferramenta para realizar cada tarefa."
    >
      <div className="grid md:grid-cols-2 gap-4">
        {SIXTEEN_WEEK_CURRICULUM.map((week) => (
          <article
            key={week.week}
            className={`editorial-card p-5 space-y-3 ${
              week.isCheckpoint
                ? "border-l-4 border-l-[var(--accent-emerald)]"
                : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
                Semana {String(week.week).padStart(2, "0")}
              </span>
              {week.isCheckpoint ? (
                <span className="inline-flex items-center gap-1 font-mono-tech text-[11px] px-2 py-0.5 rounded bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
                  <Flag className="w-3 h-3" />
                  {week.milestone}
                </span>
              ) : (
                <span className="font-mono-tech text-[11px] text-[var(--ink-muted)]">
                  {week.milestone}
                </span>
              )}
            </div>

            <h2 className="font-display text-xl font-semibold">{week.title}</h2>

            <ul className="text-xs text-[var(--ink-secondary)] space-y-1">
              {week.communicativeMissions.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>

            <div className="pt-2 border-t border-[var(--border-hairline)] flex flex-wrap gap-1.5">
              {week.coreChunks.map((chunk) => (
                <span
                  key={chunk}
                  className="font-mono-tech text-[11px] px-2 py-0.5 rounded bg-[var(--bg-elevated)]"
                >
                  {chunk}
                </span>
              ))}
            </div>

            <p className="text-[11px] text-[var(--ink-muted)]">
              <strong>Pronúncia:</strong> {week.pronunciationFocus}
            </p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
