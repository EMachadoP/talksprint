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
    <div className="editorial-card p-4 sm:p-5 relative overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono-tech text-[11px] uppercase tracking-widest text-[var(--ink-muted)]">
            Mastery Under Transfer (MUT)
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
              {pct}%
            </span>
            <span className="text-xs text-[var(--ink-muted)]">
              alvos usados sem pista em contexto inédito
            </span>
          </div>
        </div>
        <div className="sm:text-right shrink-0">
          <span className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--ink-muted)] block">
            Passaporte CEFR
          </span>
          <span className="inline-flex items-center gap-1 mt-1 font-mono-tech text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
            {cefrLevel} → {targetCefr}
          </span>
        </div>
      </div>

      {/* Analog instrument track */}
      <div className="mt-4">
        <div
          role="progressbar"
          aria-label="Mastery Under Transfer"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2.5 w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border-hairline)]"
        >
          <div
            className="h-full rounded-full bg-[var(--accent-emerald)] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between gap-2 font-mono-tech text-[10px] text-[var(--ink-muted)]">
          <span>
            0% <span className="hidden sm:inline">Memória passiva</span>
          </span>
          <span>
            50% <span className="hidden sm:inline">Recuperação</span>
          </span>
          <span>
            80%+ <span className="hidden sm:inline">Transferência retida</span>
          </span>
        </div>
      </div>
    </div>
  );
}
