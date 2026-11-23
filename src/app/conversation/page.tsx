"use client";

import { useState } from "react";
import {
  AlertCircle,
  Mic,
  MicOff,
  RefreshCcw,
  Send,
  Volume2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CONVERSATION_MISSIONS } from "@/lib/domain/curriculum";
import type {
  CorrectiveTarget,
  TutorMode,
  TutorTurnResponse,
} from "@/lib/domain/types";

interface ChatMessage {
  role: "tutor" | "learner";
  text: string;
  feedbackTargets?: CorrectiveTarget[];
  helpInPortuguese?: string | null;
  secondAttemptPrompt?: string | null;
}

export default function ConversationPage() {
  const [selectedMissionId, setSelectedMissionId] = useState(
    CONVERSATION_MISSIONS[0].id
  );
  const [mode, setMode] = useState<TutorMode>("partner");
  const mission =
    CONVERSATION_MISSIONS.find((m) => m.id === selectedMissionId) ??
    CONVERSATION_MISSIONS[0];

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "tutor", text: mission.openingLine },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [needsSecondAttempt, setNeedsSecondAttempt] = useState(false);
  const [turnNumber, setTurnNumber] = useState(1);

  function selectMission(id: string) {
    const next = CONVERSATION_MISSIONS.find((m) => m.id === id) ?? CONVERSATION_MISSIONS[0];
    setSelectedMissionId(next.id);
    setMessages([{ role: "tutor", text: next.openingLine }]);
    setTurnNumber(1);
    setNeedsSecondAttempt(false);
  }

  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.94;
    window.speechSynthesis.speak(u);
  }

  function toggleVoiceInput() {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setMessages((prev) => [
        ...prev,
        {
          role: "tutor",
          text: "Your browser doesn't support live speech dictation here — you can type your answer directly below.",
        },
      ]);
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function sendTurn(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const utterance = input.trim();
    setMessages((prev) => [...prev, { role: "learner", text: utterance }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          utterance,
          mode,
          taskId: mission.id,
          turnNumber,
          isSecondAttempt: needsSecondAttempt,
        }),
      });

      const data: TutorTurnResponse = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "tutor",
          text: data.reply,
          feedbackTargets: data.feedbackTargets,
          helpInPortuguese: data.helpInPortuguese,
          secondAttemptPrompt: data.secondAttemptPrompt,
        },
      ]);
      setNeedsSecondAttempt(data.requiresSecondAttempt);
      setTurnNumber((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Conversação IA Orientada por Missão"
      subtitle="O tutor recebe seu nível CEFR, estruturas-alvo e erros recorrentes. Feedback seletivo de no máximo 2 erros por turno, seguido de Segunda Tentativa."
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left controls */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="editorial-card p-5 space-y-3">
            <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
              Modo do Tutor
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["coach", "Coach"],
                  ["partner", "Partner"],
                  ["examiner", "Examiner"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    mode === m
                      ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] border-[var(--ink-primary)]"
                      : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--ink-secondary)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              {mode === "coach" &&
                "Permite dicas em português sob demanda e explica padrões-alvo."}
              {mode === "partner" &&
                "Permanece em inglês e aplica feedback seletivo pós-turno."}
              {mode === "examiner" &&
                "Zero ajuda ou correção durante a tarefa (simulação de checkpoint)."}
            </p>
          </div>

          <div className="editorial-card p-5 space-y-3">
            <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
              Missão Comunicativa (TBLT)
            </p>
            <div className="space-y-2">
              {CONVERSATION_MISSIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectMission(m.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    m.id === mission.id
                      ? "border-[var(--accent-emerald)] bg-[var(--accent-emerald-soft)]/60"
                      : "border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{m.title}</span>
                    <span className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card)]">
                      {m.cefr}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)] mt-1">
                    {m.taskGoal}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat studio */}
        <section className="lg:col-span-8 editorial-card p-5 sm:p-6 flex flex-col min-h-[540px]">
          <div className="pb-4 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono-tech text-[11px] uppercase text-[var(--accent-emerald)]">
                {mission.partnerRole}
              </p>
              <h2 className="font-display text-xl font-semibold">
                {mission.title}
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mission.targetStructures.map((s) => (
                <span
                  key={s}
                  className="font-mono-tech text-[11px] px-2 py-0.5 rounded bg-[var(--bg-elevated)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 py-4 space-y-4 overflow-y-auto max-h-[380px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  msg.role === "learner" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "learner"
                      ? "bg-[var(--ink-primary)] text-[var(--bg-paper)]"
                      : "bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.role === "tutor" && (
                    <button
                      type="button"
                      onClick={() => speakText(msg.text)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono-tech text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    >
                      <Volume2 className="w-3 h-3" />
                      Ouvir
                    </button>
                  )}
                </div>

                {msg.helpInPortuguese && (
                  <div className="mt-2 max-w-[85%] p-3 rounded-xl bg-[var(--accent-ochre-soft)] text-[var(--accent-ochre)] text-xs">
                    {msg.helpInPortuguese}
                  </div>
                )}

                {msg.feedbackTargets && msg.feedbackTargets.length > 0 && (
                  <div className="mt-2 max-w-[85%] p-3.5 rounded-xl border border-[var(--accent-terracotta)]/40 bg-[var(--accent-terracotta-soft)]/70 space-y-2 text-xs">
                    <p className="font-mono-tech uppercase text-[10px] text-[var(--accent-terracotta)] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Feedback Corretivo Seletivo (máx. 2 alvos)
                    </p>
                    {msg.feedbackTargets.map((ft, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <p>
                          <span className="line-through text-[var(--accent-terracotta)]">
                            {ft.originalSnippet}
                          </span>{" "}
                          →{" "}
                          <strong className="text-[var(--accent-emerald)]">
                            {ft.suggestedForm}
                          </strong>
                        </p>
                        <p className="text-[var(--ink-secondary)]">{ft.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}

                {msg.secondAttemptPrompt && (
                  <div className="mt-2 max-w-[85%] p-3 rounded-xl bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)] text-xs flex items-center gap-2">
                    <RefreshCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>{msg.secondAttemptPrompt}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={sendTurn}
            className="pt-4 border-t border-[var(--border-hairline)] flex items-center gap-2 min-w-0"
          >
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2.5 sm:p-3 rounded-xl border shrink-0 transition-colors ${
                listening
                  ? "bg-[var(--accent-terracotta)] text-white border-[var(--accent-terracotta)]"
                  : "border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-elevated)]"
              }`}
              title="Falar pelo microfone (Web Speech API)"
              aria-label="Falar pelo microfone"
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                needsSecondAttempt
                  ? "Segunda tentativa: reformule..."
                  : "Responda em inglês..."
              }
              className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm focus:outline-none focus:border-[var(--accent-emerald)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-[var(--accent-emerald)] text-white text-sm font-medium shrink-0 hover:bg-[var(--accent-emerald-hover)] disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}
