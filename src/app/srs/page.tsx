"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, RotateCcw, Timer, Volume2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MutGauge } from "@/components/MutGauge";
import type { CompetencyNode } from "@/lib/domain/types";
import { RETRIEVAL_STAGE_ORDER } from "@/lib/domain/adaptive-engine";

type RankedNode = CompetencyNode & { priorityScore: number };

const STAGE_LABELS: Record<string, string> = {
  recognize: "1. Reconhecer",
  complete: "2. Completar",
  cued_recall: "3. Recuperar com pista",
  intent_to_english: "4. Traduzir intenção → EN",
  sentence_use: "5. Usar em frase própria",
  unpredictable_conversation: "6. Conversa imprevisível",
};

export default function SrsPage() {
  const [nodes, setNodes] = useState<RankedNode[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mutScore, setMutScore] = useState(0.33);
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [novelContext, setNovelContext] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    fetch("/api/today")
      .then((r) => r.json())
      .then((d) => {
        setNodes(d.rankedNodes ?? []);
        setMutScore(d.mutScore ?? 0.33);
        startedAt.current = Date.now();
      })
      .catch(() => null);
  }, []);

  const current = nodes[currentIdx];

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }

  async function submitOutcome(correct: boolean) {
    if (!current) return;
    const responseTimeMs = Math.max(400, Date.now() - startedAt.current);

    const res = await fetch("/api/srs/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nodeId: current.id,
        correct,
        responseTimeMs,
        usedHint: showHint,
        novelContext,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setMutScore(data.mutScore);
      setNodes((prev) =>
        prev.map((n) => (n.id === current.id ? data.updatedNode : n))
      );
      setFeedback(
        correct
          ? `Registrado em ${(responseTimeMs / 1000).toFixed(1)}s · Novo estágio: ${
              STAGE_LABELS[data.updatedNode.retrievalStage]
            } · Domínio: ${Math.round(data.updatedNode.masteryProbability * 100)}%`
          : "Reagendado para retorno em 2 horas com foco em recuperação ativa."
      );
      setAnswer("");
      setShowHint(false);
      setNovelContext(false);
      startedAt.current = Date.now();
    }
  }

  function nextCard() {
    setFeedback(null);
    setAnswer("");
    setShowHint(false);
    setCurrentIdx((prev) => (nodes.length > 0 ? (prev + 1) % nodes.length : 0));
    startedAt.current = Date.now();
  }

  return (
    <AppShell
      title="SRS Produtivo em 6 Níveis"
      subtitle="Flashcards de reconhecimento não bastam para conversar. O agendador considera acerto, tempo de resposta, uso de dica e transferência em contexto novo."
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {current ? (
            <div className="editorial-card p-6 sm:p-8 space-y-6 animate-studio-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono-tech text-xs uppercase px-2.5 py-1 rounded bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
                  {STAGE_LABELS[current.retrievalStage] ?? current.retrievalStage}
                </span>
                <span className="font-mono-tech text-xs text-[var(--ink-muted)] flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  Prioridade P = {current.priorityScore.toFixed(3)}
                </span>
              </div>

              {/* 6-stage progress strip */}
              <div className="grid grid-cols-6 gap-1.5">
                {RETRIEVAL_STAGE_ORDER.map((st, idx) => {
                  const activeIdx = RETRIEVAL_STAGE_ORDER.indexOf(current.retrievalStage);
                  return (
                    <div
                      key={st}
                      className={`h-1.5 rounded-full ${
                        idx <= activeIdx
                          ? "bg-[var(--accent-emerald)]"
                          : "bg-[var(--bg-elevated)]"
                      }`}
                    />
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
                  Intenção comunicativa ({current.exampleContext})
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)]">
                  &ldquo;{current.ptIntent}&rdquo;
                </h2>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono-tech uppercase text-[var(--ink-muted)] block">
                  Produza em inglês antes de ver a resposta:
                </label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Digite ou fale em voz alta a expressão em inglês..."
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-base focus:outline-none focus:border-[var(--accent-emerald)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-hairline)] text-xs font-medium hover:bg-[var(--bg-elevated)]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver pista / modelo
                </button>
                <button
                  type="button"
                  onClick={() => speak(current.targetText)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-hairline)] text-xs font-medium hover:bg-[var(--bg-elevated)]"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Ouvir pronúncia
                </button>
                <label className="inline-flex items-center gap-2 text-xs text-[var(--ink-secondary)] ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novelContext}
                    onChange={(e) => setNovelContext(e.target.checked)}
                    className="accent-[var(--accent-emerald)]"
                  />
                  Usei em contexto novo (conta para MUT)
                </label>
              </div>

              {showHint && (
                <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
                  <p className="font-mono-tech text-[11px] uppercase text-[var(--ink-muted)]">
                    Chunk-alvo
                  </p>
                  <p className="font-display text-xl font-medium mt-1">
                    {current.targetText}
                  </p>
                </div>
              )}

              {feedback && (
                <div className="p-3.5 rounded-xl bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)] text-xs font-mono-tech">
                  {feedback}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => submitOutcome(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-emerald)] text-white text-sm font-medium hover:bg-[var(--accent-emerald-hover)]"
                >
                  <Check className="w-4 h-4" />
                  Recuperei corretamente
                </button>
                <button
                  type="button"
                  onClick={() => submitOutcome(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-terracotta-soft)] text-[var(--accent-terracotta)] text-sm font-medium hover:bg-[var(--accent-terracotta)] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  Travei / Errei
                </button>
                <button
                  type="button"
                  onClick={nextCard}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border-hairline)] text-sm hover:bg-[var(--bg-elevated)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Próximo item
                </button>
              </div>
            </div>
          ) : (
            <div className="editorial-card p-8 text-sm text-[var(--ink-muted)]">
              Carregando fila adaptativa...
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-5">
          <MutGauge mutScore={mutScore} cefrLevel="A1+" targetCefr="B1" />

          <div className="editorial-card p-5 space-y-3 text-xs">
            <h3 className="font-display text-base font-semibold">
              Critério de Domínio Real
            </h3>
            <p className="text-[var(--ink-muted)] leading-relaxed">
              Um item só recebe status <strong>dominado</strong> quando atinge
              probabilidade ≥ 80%, é recuperado em <strong>mais de uma sessão</strong> e
              usado produtivamente em <strong>contexto diferente</strong>.
            </p>
            <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1 font-mono-tech text-[11px] text-[var(--ink-secondary)]">
              <p>R = Risco de esquecimento (30%)</p>
              <p>G = Lacuna de domínio (25%)</p>
              <p>C = Custo comunicativo (20%)</p>
              <p>T = Transferência PT-BR (15%)</p>
              <p>U = Relevância pessoal (10%)</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
