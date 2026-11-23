"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "register"
          ? { displayName, email, password }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível autenticar.");
      } else {
        router.push(mode === "register" ? "/onboarding" : "/today");
      }
    } catch {
      setError("Falha de conexão ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title={mode === "register" ? "Criar Conta Real" : "Entrar no Estúdio"}
      subtitle="Seu perfil PII fica isolado do seu ID pseudônimo de aprendizagem (LGPD). Todo novo aluno começa com 0% de domínio e constrói seu histórico real."
    >
      <div className="max-w-md mx-auto editorial-card p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border ${
              mode === "register"
                ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] border-[var(--ink-primary)]"
                : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--ink-secondary)]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Criar conta
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border ${
              mode === "login"
                ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] border-[var(--ink-primary)]"
                : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--ink-secondary)]"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Já tenho conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <label className="block space-y-1.5">
              <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
                Seu nome
              </span>
              <input
                type="text"
                required
                minLength={2}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex.: Eldon"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
              E-mail
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
              Senha (mín. 8 caracteres)
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
            />
          </label>

          {error && (
            <p className="text-xs text-[var(--accent-terracotta)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent-emerald)] text-white text-sm font-medium hover:bg-[var(--accent-emerald-hover)] disabled:opacity-60"
          >
            {loading
              ? "Processando..."
              : mode === "register"
                ? "Criar Conta e Iniciar Placement"
                : "Entrar no Meu Plano"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
