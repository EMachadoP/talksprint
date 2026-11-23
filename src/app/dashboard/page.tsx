"use client";

import { useEffect, useState } from "react";
import { Award, CheckCircle2, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MutGauge } from "@/components/MutGauge";
import type { CheckpointEvaluation } from "@/lib/domain/types";

const DIMENSION_LABELS: Record<string, string> = {
  taskCompletion: "Cumprimento da tarefa",
  comprehensibility: "Compreensibilidade",
  interaction: "Interação e turnos",
  fluency: "Fluência",
  accuracy: "Precisão",
  range: "Amplitude lexical",
  pronunciation: "Pronúncia",
  listening: "Listening",
};

export default function DashboardPage() {
  const [mutScore, setMutScore] = useState(0.33);
  const [cefr, setCefr] = useState("A1");
  const [responseText, setResponseText] = useState(
    "Excuse me, there seems to be a mistake with my reservation. Yesterday I booked a table for four people, could you check if another table is available?"
  );
  const [evaluation, setEvaluation] = useState<CheckpointEvaluation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/today")
      .then((r) => r.json())
      .then((d) => {
        setMutScore(d.mutScore ?? 0.33);
        setCefr(d.learner?.currentCefr ?? "A1");
        if (d.learner?.checkpoints?.[0]) {
          setEvaluation(d.learner.checkpoints[0]);
        }
      })
      .catch(() => null);
  }, []);

  async function runCheckpoint(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/checkpoint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          weekNumber: 8,
          trainedTaskId: "hotel-problem",
          userResponseText: responseText,
          listeningCorrectRatio: 0.82,
        }),
      });
      if (res.ok) {
        const ev: CheckpointEvaluation = await res.json();
        setEvaluation(ev);
        setCefr(ev.estimatedCefr);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Mastery, Transferência & Checkpoints CEFR"
      subtitle="Avaliação separada do reconhecimento de voz (ASR), em 8 dimensões CEFR usando tarefas inéditas para evitar inflação de notas."
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <MutGauge mutScore={mutScore} cefrLevel={cefr} targetCefr="B1" />

          {/* Novel Task Checkpoint Simulator */}
          <form
            onSubmit={runCheckpoint}
            className="editorial-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-tech text-xs uppercase text-[var(--accent-emerald)]">
                Checkpoint de Transferência (Semana 8)
              </span>
              <span className="font-mono-tech text-[11px] px-2 py-0.5 rounded bg-[var(--bg-elevated)]">
                Treinou: Hotel → Avalia: Restaurante (Inédito)
              </span>
            </div>

            <p className="text-sm text-[var(--ink-secondary)]">
              Responda sem roteiro como resolveria um erro em uma reserva de restaurante
              (transferindo o que você treinou no cenário de hotel):
            </p>

            <textarea
              rows={3}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
            />

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-paper)] text-sm font-medium hover:bg-[var(--accent-emerald)] transition-colors"
            >
              <Send className="w-4 h-4" />
              {loading ? "Avaliando rubrica 8D..." : "Avaliar Checkpoint CEFR (8 Dimensões)"}
            </button>
          </form>

          {evaluation && (
            <div className="editorial-card p-6 space-y-4 animate-studio-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-[var(--accent-emerald)]" />
                  Perfil Multidimensional CEFR
                </h2>
                <span className="font-mono-tech text-sm font-semibold px-3 py-1 rounded bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
                  Estimativa: {evaluation.estimatedCefr} ({evaluation.overallScore}/100)
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(evaluation.dimensions).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-hairline)]"
                  >
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>{DIMENSION_LABELS[key] ?? key}</span>
                      <span className="font-mono-tech font-semibold">{val}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-emerald)]"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weekly Capability Report (Not "1200 XP") */}
        <aside className="lg:col-span-5 editorial-card p-6 space-y-4">
          <p className="font-mono-tech text-xs uppercase tracking-widest text-[var(--accent-emerald)]">
            Relatório Semanal de Capacidade
          </p>
          <h3 className="font-display text-2xl font-semibold">
            Competência real, não XP.
          </h3>

          <div className="space-y-3 text-sm">
            <div className="p-3.5 rounded-xl bg-[var(--accent-emerald-soft)]/70 flex gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[var(--accent-emerald)] shrink-0 mt-0.5" />
              <p>
                <strong>Você agora consegue:</strong>{" "}
                {evaluation?.weeklyCapabilitySummary.canDoNow ??
                  "Pedir e corrigir um pedido em restaurante sem ajuda."}
              </p>
            </div>

            <dl className="divide-y divide-[var(--border-hairline)] text-xs">
              <div className="py-2.5 flex justify-between">
                <dt className="text-[var(--ink-muted)]">Listening</dt>
                <dd className="font-mono-tech font-semibold">
                  {evaluation?.weeklyCapabilitySummary.listeningLevel ?? "A2 inicial"}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-[var(--ink-muted)]">Interação</dt>
                <dd className="font-mono-tech font-semibold">
                  {evaluation?.weeklyCapabilitySummary.interactionLevel ?? "A1+"}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-[var(--ink-muted)]">Pronúncia</dt>
                <dd className="font-mono-tech font-semibold">
                  {evaluation?.weeklyCapabilitySummary.pronunciationTargetsMastered ??
                    "3 de 5 alvos dominados"}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-[var(--ink-muted)]">Retenção após 7 dias</dt>
                <dd className="font-mono-tech font-semibold text-[var(--accent-emerald)]">
                  {evaluation?.weeklyCapabilitySummary.retention7DayPercent ?? 84}%
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[var(--ink-muted)]">Maior lacuna</dt>
                <dd className="text-right font-medium text-[var(--accent-terracotta)]">
                  {evaluation?.weeklyCapabilitySummary.biggestGap ??
                    "Perguntas no passado"}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[var(--ink-muted)]">Próxima missão</dt>
                <dd className="text-right font-medium">
                  {evaluation?.weeklyCapabilitySummary.nextMission ??
                    "Contar uma experiência de viagem"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
