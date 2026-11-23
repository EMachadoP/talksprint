"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

interface PrivacyInfo {
  pseudonymId: string;
  pronunciationPortfolioOptIn: boolean;
  dataInventory: {
    piiSeparated: boolean;
    rawAudioPolicy: string;
    learningEventsCount: number;
    competencyNodesCount: number;
  };
}

export default function PrivacyPage() {
  const [info, setInfo] = useState<PrivacyInfo | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/privacy");
    if (res.ok) setInfo(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function togglePortfolio(nextValue: boolean) {
    const res = await fetch("/api/privacy", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pronunciationPortfolioOptIn: nextValue }),
    });
    if (res.ok) {
      setStatusMsg(
        nextValue
          ? "Opt-in do Portfólio de Pronúncia ativado explicitamente."
          : "Padrão LGPD restaurado: áudio bruto descartado imediatamente após extração."
      );
      await load();
    }
  }

  async function handleDelete() {
    const res = await fetch("/api/privacy", { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setStatusMsg(data.message);
      await load();
    }
  }

  return (
    <AppShell
      title="Privacidade & Governança LGPD"
      subtitle="Privacy by Design: PII separado de eventos de aprendizagem pseudônimos, política de extração e descarte de áudio por padrão e exclusão propagada."
    >
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 editorial-card p-6 space-y-5">
          <div className="flex items-center gap-2 text-[var(--accent-emerald)]">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="font-display text-xl font-semibold text-[var(--ink-primary)]">
              Inventário Transparente de Dados
            </h2>
          </div>

          <dl className="divide-y divide-[var(--border-hairline)] text-sm">
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">ID Pseudônimo de Aprendizagem</dt>
              <dd className="font-mono-tech text-xs">{info?.pseudonymId ?? "..."}</dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">Separação PII ≠ Eventos ≠ Áudio</dt>
              <dd className="font-mono-tech text-xs text-[var(--accent-emerald)]">
                Ativa (schema relacional segregado)
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">Política de Áudio Bruto</dt>
              <dd className="text-right text-xs font-medium">
                {info?.dataInventory.rawAudioPolicy ?? "Extração e descarte imediato"}
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">Chamadas Humanas / Peer</dt>
              <dd className="font-mono-tech text-xs">Não gravadas por padrão</dd>
            </div>
          </dl>

          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                Portfólio de Pronúncia (Opt-in voluntário)
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                Permite guardar trechos selecionados apenas para comparar sua evolução da
                Semana 1 à Semana 16.
              </p>
            </div>
            <input
              type="checkbox"
              checked={info?.pronunciationPortfolioOptIn ?? false}
              onChange={(e) => togglePortfolio(e.target.checked)}
              className="w-5 h-5 accent-[var(--accent-emerald)] cursor-pointer"
              aria-label="Ativar portfólio de pronúncia"
            />
          </div>

          {statusMsg && (
            <p className="p-3 rounded-lg bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)] text-xs font-mono-tech">
              {statusMsg}
            </p>
          )}
        </div>

        <div className="lg:col-span-5 editorial-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">
            Direito de Exclusão Propagada
          </h3>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
            Conforme os princípios de finalidade, adequação e necessidade da LGPD, você
            pode remover seu perfil, histórico de competências e eventos sincronizados a
            qualquer momento.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-terracotta-soft)] text-[var(--accent-terracotta)] hover:bg-[var(--accent-terracotta)] hover:text-white text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir meus dados agora
          </button>
        </div>
      </div>
    </AppShell>
  );
}
