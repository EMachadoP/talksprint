"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  BookmarkPlus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MutGauge } from "@/components/MutGauge";
import { PhoneticCard } from "@/components/PhoneticCard";
import { TASK_LESSON_TEMPLATE_45M } from "@/lib/domain/curriculum";
import type { CompetencyNode, LearnerState, WeekPlan } from "@/lib/domain/types";
import { enqueueOfflineEvent, flushOfflineQueue } from "@/lib/client/offline-store";

interface TodayPayload {
  learner: LearnerState;
  weekPlan: WeekPlan;
  mutScore: number;
  rankedNodes: Array<CompetencyNode & { priorityScore: number }>;
}

export default function TodayPage() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [offlineNote, setOfflineNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/today")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => null);
  }, []);

  async function toggleStage(stageId: string) {
    setCompletedStages((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
    enqueueOfflineEvent("LESSON_COMPLETED", { stageId });
    const res = await flushOfflineQueue();
    setOfflineNote(
      res.synced > 0
        ? `Evento sincronizado com idempotência (${res.synced}).`
        : "Salvo na fila offline-first para sincronização automática."
    );
  }

  return (
    <AppShell
      title="Hoje — Estúdio Diário"
      subtitle="Zero fricção sobre o que estudar agora. Sua sequência diária prioriza recuperação ativa, tarefa comunicativa, pronúncia contrastiva e segunda tentativa."
    >
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left main sequence */}
        <div className="lg:col-span-8 space-y-6">
          <MutGauge
            mutScore={data?.mutScore ?? 0.33}
            cefrLevel={data?.learner.currentCefr ?? "A1"}
            targetCefr={data?.learner.targetCefr ?? "B1"}
          />

          {/* Current week mission */}
          <section className="editorial-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono-tech text-xs uppercase tracking-widest text-[var(--accent-emerald)]">
                Semana {data?.weekPlan.week ?? 1} de 16 · TBLT
              </span>
              <span className="font-mono-tech text-xs px-2.5 py-0.5 rounded bg-[var(--bg-elevated)]">
                Marco: {data?.weekPlan.milestone ?? "Baseline"}
              </span>
            </div>

            <h2 className="font-display text-2xl font-semibold">
              {data?.weekPlan.title ?? "Sobrevivência e Apresentação"}
            </h2>

            <div className="flex flex-wrap gap-2">
              {(data?.weekPlan.coreChunks ?? []).map((chunk) => (
                <span
                  key={chunk}
                  className="text-xs font-mono-tech px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)]"
                >
                  {chunk}
                </span>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/srs"
                className="p-3.5 rounded-xl border border-[var(--border-hairline)] hover:border-[var(--accent-emerald)] bg-[var(--bg-paper)] transition-colors flex flex-col justify-between gap-2"
              >
                <span className="font-mono-tech text-[11px] uppercase text-[var(--ink-muted)]">
                  Passo 1 · 10 min
                </span>
                <span className="font-medium text-sm flex items-center justify-between">
                  SRS Produtivo <ArrowRight className="w-4 h-4 text-[var(--accent-emerald)]" />
                </span>
              </Link>
              <Link
                href="/pronunciation"
                className="p-3.5 rounded-xl border border-[var(--border-hairline)] hover:border-[var(--accent-terracotta)] bg-[var(--bg-paper)] transition-colors flex flex-col justify-between gap-2"
              >
                <span className="font-mono-tech text-[11px] uppercase text-[var(--ink-muted)]">
                  Passo 2 · 15 min
                </span>
                <span className="font-medium text-sm flex items-center justify-between">
                  Pronúncia PT-BR <ArrowRight className="w-4 h-4 text-[var(--accent-terracotta)]" />
                </span>
              </Link>
              <Link
                href="/conversation"
                className="p-3.5 rounded-xl border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-paper)] hover:bg-[var(--accent-emerald)] hover:border-[var(--accent-emerald)] transition-colors flex flex-col justify-between gap-2"
              >
                <span className="font-mono-tech text-[11px] uppercase opacity-75">
                  Passo 3 · 30 min
                </span>
                <span className="font-medium text-sm flex items-center justify-between">
                  Conversação IA <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </section>

          {/* 45-min TBLT 9-stage checklist */}
          <section className="editorial-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[var(--accent-emerald)]" />
                <h2 className="font-display text-xl font-semibold">
                  Template de Aula Baseada em Tarefa (45 min · 9 etapas)
                </h2>
              </div>
              <span className="font-mono-tech text-xs text-[var(--ink-muted)]">
                {completedStages.length}/{TASK_LESSON_TEMPLATE_45M.length} concluídas
              </span>
            </div>

            {offlineNote && (
              <p className="text-xs font-mono-tech px-3 py-2 rounded-lg bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
                {offlineNote}
              </p>
            )}

            <div className="divide-y divide-[var(--border-hairline)]">
              {TASK_LESSON_TEMPLATE_45M.map((stage, idx) => {
                const done = completedStages.includes(stage.id);
                return (
                  <div
                    key={stage.id}
                    className="py-3 flex items-start justify-between gap-4"
                  >
                    <button
                      type="button"
                      onClick={() => toggleStage(stage.id)}
                      className="flex items-start gap-3 text-left group"
                    >
                      <CheckCircle2
                        className={`w-5 h-5 mt-0.5 shrink-0 transition-colors ${
                          done
                            ? "text-[var(--accent-emerald)]"
                            : "text-[var(--border-hairline)] group-hover:text-[var(--ink-primary)]"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            done ? "line-through text-[var(--ink-muted)]" : ""
                          }`}
                        >
                          {idx + 1}. {stage.title}
                        </p>
                        <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                          {stage.exampleHotel}
                        </p>
                      </div>
                    </button>
                    <span className="shrink-0 inline-flex items-center gap-1 font-mono-tech text-xs text-[var(--ink-muted)]">
                      <Clock className="w-3.5 h-3.5" />
                      {stage.minutes}m
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right sidebar: Priority Queue + Phonetic Anchor */}
        <div className="lg:col-span-4 space-y-6">
          <div className="editorial-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-emerald)]" />
                Fila Adaptativa de Prioridade
              </h3>
              <Link
                href="/srs"
                className="text-xs font-mono-tech text-[var(--accent-emerald)] hover:underline"
              >
                Revisar
              </Link>
            </div>
            <p className="font-mono-tech text-[11px] text-[var(--ink-muted)]">
              Prioridade = 0.30R + 0.25G + 0.20C + 0.15T + 0.10U
            </p>

            <div className="space-y-2.5">
              {(data?.rankedNodes ?? []).slice(0, 4).map((node) => (
                <div
                  key={node.id}
                  className="p-3 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-hairline)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{node.label}</span>
                    <span className="font-mono-tech text-xs font-semibold text-[var(--accent-terracotta)]">
                      P={node.priorityScore.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-muted)] mt-1">
                    Estágio: <span className="font-mono-tech">{node.retrievalStage}</span> ·
                    Domínio: {Math.round(node.masteryProbability * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          <PhoneticCard />

          <div className="editorial-card p-5 space-y-2 text-xs text-[var(--ink-muted)]">
            <p className="font-mono-tech uppercase text-[var(--ink-primary)] flex items-center gap-1.5">
              <BookmarkPlus className="w-3.5 h-3.5 text-[var(--accent-emerald)]" />
              Modo Offline-First
            </p>
            <p>
              Cada etapa marcada gera um evento imutável com <code>eventId</code>{" "}
              idempotente. Sem conexão, seu progresso fica salvo localmente e sincroniza ao
              reconectar.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
