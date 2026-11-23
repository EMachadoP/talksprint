"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AudioWaveform,
  BookOpenCheck,
  CalendarRange,
  Compass,
  Gauge,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { flushOfflineQueue, readOfflineQueue } from "@/lib/client/offline-store";

const NAV_ITEMS = [
  { href: "/today", label: "Hoje", shortLabel: "Hoje", icon: Compass },
  { href: "/srs", label: "SRS Produtivo", shortLabel: "SRS", icon: BookOpenCheck },
  { href: "/conversation", label: "Conversação IA", shortLabel: "Conversação", icon: MessageSquareText },
  { href: "/pronunciation", label: "Pronúncia PT-BR", shortLabel: "Pronúncia", icon: AudioWaveform },
  { href: "/roadmap", label: "16 Semanas", shortLabel: "16 Semanas", icon: CalendarRange },
  { href: "/dashboard", label: "Mastery & CEFR", shortLabel: "Mastery", icon: Gauge },
  { href: "/privacy", label: "Privacidade", shortLabel: "Privacidade", icon: ShieldCheck },
];

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setPendingCount(readOfflineQueue().length);

    fetch("/api/auth/me", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user?.displayName) {
          setUserName(d.user.displayName);
        }
      })
      .catch(() => null);

    const onOnline = () => {
      setOnline(true);
      void handleSync();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      controller.abort();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function handleSync() {
    setSyncing(true);
    const res = await flushOfflineQueue();
    setPendingCount(res.remaining);
    setSyncing(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--ink-primary)] focus:text-[var(--bg-paper)] focus:text-sm"
      >
        Pular para o conteúdo principal
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex items-baseline gap-2 shrink-0 group">
              <span className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)]">
                TalkSprint
              </span>
              <span className="hidden sm:inline-block font-mono-tech text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)] whitespace-nowrap">
                16W · B1
              </span>
            </Link>

            <nav
              className="hidden xl:flex items-center gap-1"
              aria-label="Navegação principal"
            >
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      active
                        ? "bg-[var(--ink-primary)] text-[var(--bg-paper)]"
                        : "text-[var(--ink-secondary)] hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {item.shortLabel}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSync}
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs font-mono-tech text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] transition-colors"
              title="Sincronizar fila offline-first"
              aria-label={online ? "Status online. Clique para sincronizar" : "Status offline"}
            >
              {online ? (
                <Wifi className="w-3.5 h-3.5 text-[var(--accent-emerald)] shrink-0" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-[var(--accent-terracotta)] shrink-0" />
              )}
              <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
              {pendingCount > 0 && (
                <span className="px-1.5 rounded-full bg-[var(--accent-terracotta-soft)] text-[var(--accent-terracotta)]">
                  {pendingCount}
                </span>
              )}
              {syncing && <RefreshCw className="w-3 h-3 animate-spin" />}
            </button>

            <Link
              href="/onboarding"
              className="hidden sm:inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border-hairline)] text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] transition-colors whitespace-nowrap"
            >
              Placement
            </Link>

            {userName ? (
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  setUserName(null);
                  window.location.href = "/login";
                }}
                className="text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-paper)] hover:bg-[var(--accent-terracotta)] transition-colors whitespace-nowrap max-w-[130px] truncate"
                title="Sair da conta"
              >
                {userName} · Sair
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-paper)] hover:bg-[var(--accent-emerald)] transition-colors whitespace-nowrap"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>

        {/* Tablet & Mobile compact horizontal nav (< 1280px) */}
        <nav
          className="xl:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 sm:px-6 pb-2.5"
          aria-label="Navegação secundária"
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] font-medium"
                    : "bg-[var(--bg-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/onboarding"
            aria-current={pathname === "/onboarding" ? "page" : undefined}
            className={`sm:hidden shrink-0 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
              pathname === "/onboarding"
                ? "bg-[var(--accent-emerald)] text-white font-medium"
                : "bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)] font-medium"
            }`}
          >
            Placement
          </Link>
        </nav>
      </header>

      <main
        id="main-content"
        className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 min-w-0"
      >
        {(title || subtitle) && (
          <div className="mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-[var(--border-hairline)] flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-[var(--ink-primary)] break-words">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-2 text-sm sm:text-base text-[var(--ink-muted)] max-w-2xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
