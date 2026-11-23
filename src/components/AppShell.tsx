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
  { href: "/today", label: "Hoje", icon: Compass },
  { href: "/srs", label: "SRS Produtivo", icon: BookOpenCheck },
  { href: "/conversation", label: "Conversação IA", icon: MessageSquareText },
  { href: "/pronunciation", label: "Pronúncia PT-BR", icon: AudioWaveform },
  { href: "/roadmap", label: "16 Semanas", icon: CalendarRange },
  { href: "/dashboard", label: "Mastery & CEFR", icon: Gauge },
  { href: "/privacy", label: "Privacidade", icon: ShieldCheck },
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
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setPendingCount(readOfflineQueue().length);

    fetch("/api/auth/me")
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
      <header className="sticky top-0 z-40 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-baseline gap-2 group">
              <span className="font-display text-xl font-semibold tracking-tight text-[var(--ink-primary)]">
                TalkSprint
              </span>
              <span className="font-mono-tech text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
                16W · B1
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Navegação principal">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] font-medium"
                        : "text-[var(--ink-secondary)] hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSync}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs font-mono-tech text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] transition-colors"
              title="Sincronizar fila offline-first"
            >
              {online ? (
                <Wifi className="w-3.5 h-3.5 text-[var(--accent-emerald)]" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-[var(--accent-terracotta)]" />
              )}
              <span>{online ? "Online" : "Offline"}</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-terracotta-soft)] text-[var(--accent-terracotta)]">
                  {pendingCount}
                </span>
              )}
              {syncing && <RefreshCw className="w-3 h-3 animate-spin" />}
            </button>

            <Link
              href="/onboarding"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border-hairline)] text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
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
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-paper)] hover:bg-[var(--accent-terracotta)] transition-colors"
                title="Sair da conta"
              >
                {userName} · Sair
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-paper)] hover:bg-[var(--accent-emerald)] transition-colors"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>

        {/* Mobile quick nav */}
        <nav className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs ${
                  active
                    ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] font-medium"
                    : "bg-[var(--bg-elevated)] text-[var(--ink-secondary)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {(title || subtitle) && (
          <div className="mb-8 pb-6 border-b border-[var(--border-hairline)] flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              {title && (
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--ink-primary)]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-2 text-sm sm:text-base text-[var(--ink-muted)] max-w-2xl">
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
