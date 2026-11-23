import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
  Target,
} from "lucide-react";
import { PhoneticCard } from "@/components/PhoneticCard";
import { MutGauge } from "@/components/MutGauge";

const CAMBRIDGE_TABLE = [
  {
    level: "A0 / pré-A1",
    target: "A2 forte / B1 nas tarefas treinadas",
    hours: "22–25 h/sem",
    note: "Plano intensivo real (ref. 350–400h)",
  },
  {
    level: "A1",
    target: "B1 conversacional",
    hours: "16–20 h/sem",
    note: "Meta agressiva e plausível",
  },
  {
    level: "A2",
    target: "B1 consolidado / início de B2",
    hours: "10–14 h/sem",
    note: "Ritmo confortável com foco em transferência",
  },
  {
    level: "B1",
    target: "B1 forte / B2 funcional",
    hours: "8–12 h/sem",
    note: "Automatização e amplitude discursiva",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-2xl font-semibold tracking-tight">
              TalkSprint
            </span>
            <span className="font-mono-tech text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
              Conversation-First · PT-BR → EN
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/today"
              className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            >
              Abrir Estúdio
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-paper)] text-sm font-medium hover:bg-[var(--accent-emerald)] transition-colors"
            >
              Fazer Placement
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Asymmetric editorial hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 grid lg:grid-cols-12 gap-10 items-start animate-studio-in">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs font-mono-tech text-[var(--ink-secondary)]">
              <Target className="w-3.5 h-3.5 text-[var(--accent-emerald)]" />
              Sem promessas mágicas de 5 minutos/dia · Baseado em SLA & CEFR
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.06] tracking-tight text-[var(--ink-primary)]">
              Desempenho conversacional{" "}
              <span className="italic text-[var(--accent-emerald)]">CEFR B1</span>{" "}
              em 16 semanas — medido por transferência real.
            </h1>

            <p className="text-base sm:text-lg text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              O TalkSprint não otimiza <em>streaks</em> nem XP. Cada minuto conecta{" "}
              <strong>tarefas comunicativas reais (TBLT)</strong>,{" "}
              <strong>SRS produtivo em 6 níveis</strong>,{" "}
              <strong>pronúncia contrastiva PT-BR</strong> e{" "}
              <strong>conversação com IA com feedback seletivo</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--accent-emerald)] text-white font-medium hover:bg-[var(--accent-emerald-hover)] transition-colors"
              >
                Iniciar Placement Adaptativo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/today"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-[var(--ink-primary)] text-[var(--ink-primary)] font-medium hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Explorar Estúdio de Hoje
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-6 border-t border-[var(--border-hairline)]">
              <div>
                <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
                  North Star
                </p>
                <p className="mt-1 text-sm font-medium">
                  Tarefas inéditas concluídas por hora de estudo
                </p>
              </div>
              <div>
                <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
                  Foco PT-BR
                </p>
                <p className="mt-1 text-sm font-medium">
                  Epêntese, consoantes finais, -ed e /θ ð/ sob diagnóstico
                </p>
              </div>
              <div>
                <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
                  LGPD by Design
                </p>
                <p className="mt-1 text-sm font-medium">
                  Áudio bruto descartado por padrão após análise
                </p>
              </div>
            </div>
          </div>

          {/* Right column: Differentiation Anchors */}
          <div className="lg:col-span-5 space-y-5">
            <MutGauge mutScore={0.68} cefrLevel="A2" targetCefr="B1" />
            <PhoneticCard />
          </div>
        </section>

        {/* Honest Cambridge Workload Calibration */}
        <section className="border-y border-[var(--border-hairline)] bg-[var(--bg-elevated)]/60 py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-8">
              <p className="font-mono-tech text-xs uppercase tracking-widest text-[var(--accent-emerald)]">
                Transparência de Carga Horária
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold">
                Quatro meses é um programa intensivo, calibrado ao seu ponto de partida.
              </h2>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                Extrapolação operacional baseada nas referências de horas guiadas de Cambridge
                (90–100h A1, 180–200h A2, 350–400h B1). O avanço é validado por desempenho em
                tarefas inéditas, nunca por horas assistidas.
              </p>
            </div>

            <div className="editorial-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)] font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
                    <tr>
                      <th className="px-5 py-3.5">Nível inicial</th>
                      <th className="px-5 py-3.5">Meta em 16 semanas</th>
                      <th className="px-5 py-3.5">Carga semanal</th>
                      <th className="px-5 py-3.5">Interpretação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-hairline)]">
                    {CAMBRIDGE_TABLE.map((row) => (
                      <tr key={row.level} className="hover:bg-[var(--bg-paper)]/60">
                        <td className="px-5 py-3.5 font-mono-tech font-semibold">
                          {row.level}
                        </td>
                        <td className="px-5 py-3.5">{row.target}</td>
                        <td className="px-5 py-3.5 font-mono-tech text-[var(--accent-emerald)] font-semibold">
                          {row.hours}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--ink-muted)]">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="editorial-card p-6 space-y-3">
              <MessageSquareText className="w-6 h-6 text-[var(--accent-emerald)]" />
              <h3 className="font-display text-xl font-semibold">
                Tentar → Feedback Seletivo → Segunda Tentativa
              </h3>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                Em vez de interromper cada frase, o Tutor IA opera em 3 modos (Coach, Partner,
                Examiner), aponta no máximo 2 alvos prioritários por turno e exige reformulação
                imediata.
              </p>
            </div>
            <div className="editorial-card p-6 space-y-3">
              <AudioWaveform className="w-6 h-6 text-[var(--accent-terracotta)]" />
              <h3 className="font-display text-xl font-semibold">
                Pronúncia Contrastiva sem Estereótipos
              </h3>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                Perguntamos sua variante do português (PT-BR, PT-PT ou outra) e treinamos
                epêntese, consoantes finais, -ed e /θ ð/ apenas quando diagnosticados na sua
                fala.
              </p>
            </div>
            <div className="editorial-card p-6 space-y-3">
              <CheckCircle2 className="w-6 h-6 text-[var(--accent-emerald)]" />
              <h3 className="font-display text-xl font-semibold">
                Checkpoints em Tarefas Inéditas
              </h3>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                Treinou reclamar de um quarto de hotel? O checkpoint avalia você resolvendo um
                problema em uma reserva de restaurante, em 8 dimensões CEFR separadas do ASR.
              </p>
            </div>
          </div>

          <div className="mt-10 editorial-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--ink-primary)] text-[var(--bg-paper)]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-[#6ee7b7] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-lg font-semibold">
                  Privacidade de Voz & Dados Educacionais (LGPD)
                </h3>
                <p className="text-sm text-[#c7d1ce]">
                  PII separado de eventos pseudônimos. Áudio bruto descartado por padrão após
                  extração de features fonéticas.
                </p>
              </div>
            </div>
            <Link
              href="/privacy"
              className="shrink-0 px-4 py-2 rounded-lg bg-[var(--bg-paper)] text-[var(--ink-primary)] text-sm font-medium hover:opacity-90"
            >
              Ver Governança
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
