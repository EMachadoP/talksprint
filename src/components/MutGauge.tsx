"use client";

export function MutGauge({
  mutScore,
  cefrLevel,
  targetCefr = "B1",
}: {
  mutScore: number; // 0..1
  cefrLevel: string;
  targetCefr?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(mutScore * 100)));

  return (
    <div className="editorial-card p-5 relative overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono-tech text-[11px] uppercase tracking-widest text-[var(--ink-muted)]">
            Mastery Under Transfer (MUT)
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold text-[var(--ink-primary)]">
              {pct}%
            </span>
            <span className="text-xs text-[var(--ink-muted)]">
              alvos usados sem pista em contexto inédito
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--ink-muted)] block">
            Passaporte CEFR
          </span>
          <span className="inline-flex items-center gap-1 mt-1 font-mono-tech text-sm font-semibold px-2.5 py-1 rounded-md bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
            {cefrLevel} → {targetCefr}
          </span>
        </div>
      </div>

      {/* Analog instrument track */}
      <div className="mt-4">
        <div className="h-2.5 w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border-hairline)]">
          <div
            className="h-full rounded-full bg-[var(--accent-emerald)] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono-tech text-[10px] text-[var(--ink-muted)]">
          <span>0% Memória passiva</span>
          <span>50% Recuperação</span>
          <span>80%+ Transferência retida</span>
        </div>
      </div>
    </div>
  );
}
