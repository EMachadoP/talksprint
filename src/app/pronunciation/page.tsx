"use client";

import { useState } from "react";
import { AudioWaveform, ShieldCheck, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PhoneticCard } from "@/components/PhoneticCard";
import type { PronunciationAnalysisResult } from "@/lib/domain/types";

const DRILLS = [
  {
    id: "epenthesis",
    label: "Consoante final /k/ (epêntese)",
    targetPhrase: "I work with a marketing team and I stopped early.",
    sampleTranscript: "I workee wit a marketing team and I stoppee early",
  },
  {
    id: "ed",
    label: "Terminação -ed no passado",
    targetPhrase: "Yesterday I worked and talked with my manager.",
    sampleTranscript: "Yesterday I work and talk with my manager",
  },
  {
    id: "th",
    label: "Fricativas dentais /θ/ e /ð/",
    targetPhrase: "I think this works better than that.",
    sampleTranscript: "I tink dis works better than dat",
  },
];

export default function PronunciationPage() {
  const [selectedDrill, setSelectedDrill] = useState(DRILLS[0]);
  const [transcript, setTranscript] = useState(DRILLS[0].sampleTranscript);
  const [analysis, setAnalysis] = useState<PronunciationAnalysisResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.86;
    window.speechSynthesis.speak(u);
  }

  async function runAnalysis(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/pronunciation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetPhrase: selectedDrill.targetPhrase,
          transcript,
        }),
      });
      if (res.ok) {
        setAnalysis(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Laboratório de Pronúncia Contrastiva PT-BR"
      subtitle="Foco em compreensibilidade e inteligibilidade — nunca em apagar identidade. Analisamos consoantes finais, epêntese, -ed e /θ ð/ sob diagnóstico."
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          <div className="editorial-card p-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              {DRILLS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDrill(d);
                    setTranscript(d.sampleTranscript);
                    setAnalysis(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedDrill.id === d.id
                      ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] border-[var(--ink-primary)]"
                      : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--ink-secondary)]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-between gap-4">
              <div>
                <p className="font-mono-tech text-[11px] uppercase text-[var(--ink-muted)]">
                  Frase-alvo
                </p>
                <p className="font-display text-xl font-medium mt-1">
                  &ldquo;{selectedDrill.targetPhrase}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => speak(selectedDrill.targetPhrase)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-hairline)] text-xs font-medium hover:border-[var(--ink-primary)]"
              >
                <Volume2 className="w-4 h-4" />
                Ouvir modelo
              </button>
            </div>

            <form onSubmit={runAnalysis} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
                  Transcrição fonética / gravação capturada
                </span>
                <textarea
                  rows={2}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-terracotta)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                <AudioWaveform className="w-4 h-4" />
                {loading ? "Analisando..." : "Analisar Inteligibilidade"}
              </button>
            </form>
          </div>

          {analysis && (
            <div className="space-y-4 animate-studio-in">
              <div className="editorial-card p-5 flex items-center justify-between">
                <div>
                  <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
                    Índice de Inteligibilidade (não substitui nota CEFR)
                  </p>
                  <p className="font-display text-3xl font-semibold mt-1">
                    {analysis.intelligibilityScore}/100
                  </p>
                </div>
                <span className="font-mono-tech text-xs px-3 py-1 rounded-full bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
                  {analysis.priorityIssues.length} alvo(s) prioritário(s)
                </span>
              </div>

              {analysis.priorityIssues.map((issue) => (
                <PhoneticCard
                  key={`${issue.targetId}-${issue.word}`}
                  observed={issue.observedForm}
                  targetWord={issue.word}
                  ipa={issue.ipaTarget}
                  minimalPair={issue.minimalPair}
                  tip={issue.explanationPt}
                  practiceSentence={selectedDrill.targetPhrase}
                />
              ))}

              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-start gap-2.5 text-xs text-[var(--ink-secondary)]">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-emerald)] shrink-0 mt-0.5" />
                <span>{analysis.privacyNotice}</span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-5">
          <PhoneticCard />
          <div className="editorial-card p-5 space-y-2 text-xs text-[var(--ink-muted)]">
            <p className="font-mono-tech uppercase text-[var(--ink-primary)]">
              Template de Pronúncia (18 min)
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Diagnóstico (2 min) — gravar palavras-alvo</li>
              <li>Percepção (3 min) — distinguir pares mínimos</li>
              <li>Articulação (3 min) — explicação contrastiva PT-BR</li>
              <li>Produção controlada (3 min) — palavra → frase</li>
              <li>Feedback seletivo (2 min) — apenas característica-alvo</li>
              <li>Transferência (3 min) — responder pergunta espontânea</li>
              <li>Delayed seed (2 min) — agendar retorno no SRS</li>
            </ol>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
