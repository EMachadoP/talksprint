"use client";

import { Volume2 } from "lucide-react";

export function PhoneticCard({
  observed = "I work-ee with marketing.",
  targetWord = "work",
  ipa = "/wɜːrk/",
  minimalPair = ["work", "working"] as [string, string],
  tip = "Tente sem adicionar uma vogal /i/ depois de /k/.",
  practiceSentence = "I work with a marketing team.",
}: {
  observed?: string;
  targetWord?: string;
  ipa?: string;
  minimalPair?: [string, string];
  tip?: string;
  practiceSentence?: string;
}) {
  function speak(text: string, rate = 0.9) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="editorial-card p-5 border-l-4 border-l-[var(--accent-terracotta)]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono-tech text-[11px] uppercase tracking-widest text-[var(--accent-terracotta)]">
          Contraste Fonético PT-BR → EN
        </span>
        <span className="font-mono-tech text-xs px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--ink-primary)]">
          {ipa}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <p className="text-[var(--ink-muted)]">
          Você disse:{" "}
          <span className="font-mono-tech text-[var(--accent-terracotta)] line-through decoration-2">
            {observed}
          </span>
        </p>
        <p className="text-[var(--ink-primary)]">
          Prioridade: final de{" "}
          <strong className="font-display text-base">{targetWord}</strong> — {tip}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {minimalPair.map((word) => (
          <button
            key={word}
            type="button"
            onClick={() => speak(word, 0.85)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--ink-primary)] hover:text-[var(--bg-paper)] text-xs font-mono-tech transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Ouça: {word}
          </button>
        ))}
        <button
          type="button"
          onClick={() => speak(practiceSentence, 0.92)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)] hover:text-white text-xs font-medium transition-colors"
        >
          <Volume2 className="w-3.5 h-3.5" />
          Frase completa
        </button>
      </div>

      <p className="mt-3 pt-3 border-t border-[var(--border-hairline)] text-xs text-[var(--ink-secondary)]">
        Agora diga:{" "}
        <span className="font-display text-sm font-medium text-[var(--ink-primary)]">
          &ldquo;{practiceSentence}&rdquo;
        </span>
      </p>
    </div>
  );
}
