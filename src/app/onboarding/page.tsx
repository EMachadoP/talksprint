"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import type {
  PlacementResult,
  PortugueseVariety,
  PrioritySituation,
  SpeakingComfort,
} from "@/lib/domain/types";

const SITUATIONS: Array<{ id: PrioritySituation; label: string }> = [
  { id: "travel", label: "Viagens, hotel e aeroporto" },
  { id: "work_meetings", label: "Reuniões e trabalho remoto" },
  { id: "restaurants_services", label: "Restaurantes e serviços" },
  { id: "daily_life", label: "Cotidiano e rotina" },
  { id: "social_small_talk", label: "Small talk e vida social" },
  { id: "job_interviews", label: "Entrevistas de emprego" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [portugueseVariety, setPortugueseVariety] =
    useState<PortugueseVariety>("pt-BR");
  const [selfReportedLevel, setSelfReportedLevel] = useState<
    "A0" | "A1" | "A2" | "B1"
  >("A1");
  const [weeklyHoursAvailable, setWeeklyHoursAvailable] = useState(16);
  const [speakingComfort, setSpeakingComfort] =
    useState<SpeakingComfort>("low");
  const [prioritySituations, setPrioritySituations] = useState<
    PrioritySituation[]
  >(["travel", "work_meetings"]);

  // Mini adaptive placement inputs (clean, no mocked answers)
  const [recognitionChoice, setRecognitionChoice] = useState("");
  const [listeningChoice, setListeningChoice] = useState("");
  const [speakingSample, setSpeakingSample] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);

  function toggleSituation(id: PrioritySituation) {
    setPrioritySituations((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((s) => s !== id)
          : prev
        : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const recognitionScore =
      recognitionChoice === "b"
        ? selfReportedLevel === "A0"
          ? 25
          : selfReportedLevel === "A1"
            ? 55
            : selfReportedLevel === "A2"
              ? 75
              : 90
        : 20;
    const listeningScore = listeningChoice === "a" ? recognitionScore : 25;

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          portugueseVariety,
          selfReportedLevel,
          weeklyHoursAvailable,
          speakingComfort,
          prioritySituations,
          placementAnswers: {
            recognitionScore,
            listeningScore,
            speakingTranscripts: [speakingSample],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao processar placement.");
      } else {
        setResult(data.placement);
      }
    } catch {
      setError("Falha de conexão ao salvar placement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Onboarding & Placement Adaptativo"
      subtitle="Calibramos sua meta de 16 semanas contra sua disponibilidade real, sua variante do português e seu perfil fonético inicial."
    >
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 editorial-card p-6 space-y-6"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
                Como prefere ser chamado(a)?
              </span>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm focus:outline-none focus:border-[var(--accent-emerald)]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
                Variante do Português
              </span>
              <select
                value={portugueseVariety}
                onChange={(e) =>
                  setPortugueseVariety(e.target.value as PortugueseVariety)
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
              >
                <option value="pt-BR">Português Brasileiro (PT-BR)</option>
                <option value="pt-PT">Português Europeu (PT-PT)</option>
                <option value="other">Outra variante</option>
              </select>
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
                Nível Atual Estimado
              </span>
              <select
                value={selfReportedLevel}
                onChange={(e) =>
                  setSelfReportedLevel(
                    e.target.value as "A0" | "A1" | "A2" | "B1"
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
              >
                <option value="A0">A0 / Iniciante absoluto</option>
                <option value="A1">A1 / Básico inicial</option>
                <option value="A2">A2 / Básico consolidado</option>
                <option value="B1">B1 / Intermediário funcional</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
                Disponibilidade Semanal:{" "}
                <strong className="text-[var(--accent-emerald)]">
                  {weeklyHoursAvailable}h/sem
                </strong>
              </span>
              <input
                type="range"
                min={4}
                max={30}
                value={weeklyHoursAvailable}
                onChange={(e) => setWeeklyHoursAvailable(Number(e.target.value))}
                className="w-full accent-[var(--accent-emerald)] mt-2"
              />
              <div className="flex justify-between text-[11px] font-mono-tech text-[var(--ink-muted)]">
                <span>4h</span>
                <span>16h (A1→B1)</span>
                <span>24h (A0→B1)</span>
                <span>30h</span>
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)] block">
              Conforto ao falar em inglês hoje
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["low", "Travo bastante"],
                  ["medium", "Falo frases curtas"],
                  ["high", "Sustento diálogo"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSpeakingComfort(val)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    speakingComfort === val
                      ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] border-[var(--ink-primary)]"
                      : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--ink-secondary)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)] block">
              Situações prioritárias (define relevância U no algoritmo)
            </span>
            <div className="flex flex-wrap gap-2">
              {SITUATIONS.map((sit) => {
                const selected = prioritySituations.includes(sit.id);
                return (
                  <button
                    key={sit.id}
                    type="button"
                    onClick={() => toggleSituation(sit.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selected
                        ? "bg-[var(--accent-emerald-soft)] border-[var(--accent-emerald)] text-[var(--accent-emerald)] font-medium"
                        : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {sit.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mini Placement */}
          <div className="pt-4 border-t border-[var(--border-hairline)] space-y-4">
            <h2 className="font-display text-lg font-semibold">
              Mini-Diagnóstico (Reconhecimento + Listening + Fala)
            </h2>

            <div className="space-y-1.5">
              <p className="text-xs text-[var(--ink-secondary)] font-medium">
                1. Em um hotel, qual frase relata um problema de forma natural e polida?
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecognitionChoice("a")}
                  className={`p-2.5 text-left rounded-lg border text-xs ${
                    recognitionChoice === "a"
                      ? "border-[var(--ink-primary)] bg-[var(--bg-elevated)]"
                      : "border-[var(--border-hairline)]"
                  }`}
                >
                  A) My room no have air conditioning, change now.
                </button>
                <button
                  type="button"
                  onClick={() => setRecognitionChoice("b")}
                  className={`p-2.5 text-left rounded-lg border text-xs ${
                    recognitionChoice === "b"
                      ? "border-[var(--accent-emerald)] bg-[var(--accent-emerald-soft)]"
                      : "border-[var(--border-hairline)]"
                  }`}
                >
                  B) There seems to be a problem with the air conditioning in my room.
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-[var(--ink-secondary)] font-medium">
                2. Ao ouvir &ldquo;Could you clarify that last part?&rdquo;, o falante está:
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setListeningChoice("a")}
                  className={`p-2.5 text-left rounded-lg border text-xs ${
                    listeningChoice === "a"
                      ? "border-[var(--accent-emerald)] bg-[var(--accent-emerald-soft)]"
                      : "border-[var(--border-hairline)]"
                  }`}
                >
                  A) Pedindo esclarecimento (reparo conversacional)
                </button>
                <button
                  type="button"
                  onClick={() => setListeningChoice("b")}
                  className={`p-2.5 text-left rounded-lg border text-xs ${
                    listeningChoice === "b"
                      ? "border-[var(--ink-primary)] bg-[var(--bg-elevated)]"
                      : "border-[var(--border-hairline)]"
                  }`}
                >
                  B) Encerrando a reunião imediatamente
                </button>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs text-[var(--ink-secondary)] font-medium">
                3. Amostra de fala / escrita espontânea (usada para diagnosticar transferência fonética e gramatical):
              </span>
              <textarea
                rows={2}
                value={speakingSample}
                onChange={(e) => setSpeakingSample(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-[var(--accent-terracotta)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent-emerald)] text-white font-medium hover:bg-[var(--accent-emerald-hover)] disabled:opacity-60 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Gerando Plano de 16 Semanas..." : "Gerar Plano Individual de 16 Semanas"}
          </button>
        </form>

        {/* Result panel */}
        <div className="lg:col-span-5 space-y-4">
          {result ? (
            <div className="editorial-card p-6 space-y-5 animate-studio-in">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-xs uppercase tracking-widest text-[var(--accent-emerald)]">
                  Perfil Diagnosticado
                </span>
                <span className="font-mono-tech text-sm font-semibold px-2.5 py-1 rounded bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
                  {result.diagnosedCefr} → {result.recommendedTargetCefr}
                </span>
              </div>

              <div
                className={`p-4 rounded-xl text-sm flex gap-3 ${
                  result.hoursSufficiency === "under_allocated"
                    ? "bg-[var(--accent-terracotta-soft)] text-[var(--accent-terracotta)]"
                    : "bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]"
                }`}
              >
                {result.hoursSufficiency === "under_allocated" ? (
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <p>{result.honestExpectationMessage}</p>
              </div>

              <div>
                <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)] mb-2">
                  Alvos Fonéticos Diagnosticados ({portugueseVariety})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.diagnosedPhoneticTargets.map((t) => (
                    <span
                      key={t}
                      className="font-mono-tech text-xs px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)] mb-2">
                  Sessão Diária Estruturada ({result.dailyScheduleBlocks.length} blocos)
                </p>
                <ul className="space-y-1.5 text-xs">
                  {result.dailyScheduleBlocks.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between py-1 border-b border-[var(--border-hairline)] last:border-0"
                    >
                      <span>{b.title}</span>
                      <span className="font-mono-tech text-[var(--ink-muted)]">
                        {b.minutes} min
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => router.push("/today")}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-paper)] font-medium hover:bg-[var(--accent-emerald)] transition-colors"
              >
                Ir para o Estúdio de Hoje
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="editorial-card p-6 space-y-3 text-sm text-[var(--ink-muted)]">
              <p className="font-mono-tech text-xs uppercase tracking-widest text-[var(--ink-primary)]">
                Como funciona o Placement
              </p>
              <p>
                Em vez de classificar você por um único rótulo, o TalkSprint cria um{" "}
                <strong>grafo de competências</strong> com risco de esquecimento,
                lacuna de domínio, custo comunicativo e risco de transferência da sua
                variante do português.
              </p>
              <p>
                Preencha o formulário ao lado para gerar seu plano de 16 semanas e sua
                sequência diária automática.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
