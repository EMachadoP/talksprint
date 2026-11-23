"use client";

import { useRef, useState } from "react";
import { AudioWaveform, Mic, Square, ShieldCheck, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PhoneticCard } from "@/components/PhoneticCard";
import type { PronunciationAnalysisResult } from "@/lib/domain/types";

const DRILLS = [
  {
    id: "epenthesis",
    label: "Consoante final /k/ (epêntese)",
    targetPhrase: "I work with a marketing team and I stopped early.",
  },
  {
    id: "ed",
    label: "Terminação -ed no passado",
    targetPhrase: "Yesterday I worked and talked with my manager.",
  },
  {
    id: "th",
    label: "Fricativas dentais /θ/ e /ð/",
    targetPhrase: "I think this works better than that.",
  },
];

export default function PronunciationPage() {
  const [selectedDrill, setSelectedDrill] = useState(DRILLS[0]);
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [analysis, setAnalysis] = useState<PronunciationAnalysisResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.86;
    window.speechSynthesis.speak(u);
  }

  async function startRecording() {
    setError(null);
    setAnalysis(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await sendAudioForAnalysis(blob, mimeType);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError(
        "Não foi possível acessar o microfone. Permita o uso do microfone no navegador ou digite sua transcrição abaixo."
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function sendAudioForAnalysis(blob: Blob, mimeType: string) {
    setLoading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result ?? "");
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/pronunciation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetPhrase: selectedDrill.targetPhrase,
          audioBase64: base64,
          audioMimeType: mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao analisar áudio.");
      } else {
        setAnalysis(data);
        if (data.transcript) setTranscript(data.transcript);
      }
    } catch {
      setError("Falha ao enviar áudio para análise.");
    } finally {
      setLoading(false);
    }
  }

  async function runTextAnalysis(e: React.FormEvent) {
    e.preventDefault();
    if (!transcript.trim()) {
      setError("Grave pelo microfone ou informe o que você falou.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pronunciation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetPhrase: selectedDrill.targetPhrase,
          transcript: transcript.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao analisar pronúncia.");
      } else {
        setAnalysis(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Laboratório de Pronúncia Contrastiva PT-BR"
      subtitle="Grave sua fala real pelo microfone. O Gemini 2.5 Flash analisa inteligibilidade e transferência PT-BR e descarta o áudio bruto imediatamente após a extração (LGPD)."
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          <div className="editorial-card p-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              {DRILLS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDrill(d);
                    setTranscript("");
                    setAnalysis(null);
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedDrill.id === d.id
                      ? "bg-[var(--ink-primary)] text-[var(--bg-paper)] border-[var(--ink-primary)]"
                      : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--ink-secondary)]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-between gap-4">
              <div>
                <p className="font-mono-tech text-[11px] uppercase text-[var(--ink-muted)]">
                  Frase-alvo para falar em voz alta
                </p>
                <p className="font-display text-xl font-medium mt-1">
                  &ldquo;{selectedDrill.targetPhrase}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => speak(selectedDrill.targetPhrase)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-hairline)] text-xs font-medium hover:border-[var(--ink-primary)]"
              >
                <Volume2 className="w-4 h-4" />
                Ouvir modelo
              </button>
            </div>

            {/* Real microphone recorder */}
            <div className="flex flex-wrap items-center gap-3">
              {!recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent-terracotta)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  <Mic className="w-4 h-4" />
                  Gravar minha voz agora
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-paper)] text-sm font-medium animate-pulse"
                >
                  <Square className="w-4 h-4" />
                  Parar e Analisar Áudio
                </button>
              )}
              <span className="text-xs text-[var(--ink-muted)]">
                {recording
                  ? "Gravando... fale a frase acima com naturalidade."
                  : "Áudio enviado ao Gemini 2.5 Flash e descartado logo após o feedback."}
              </span>
            </div>

            <form
              onSubmit={runTextAnalysis}
              className="pt-4 border-t border-[var(--border-hairline)] space-y-3"
            >
              <label className="block space-y-1.5">
                <span className="text-xs font-mono-tech uppercase text-[var(--ink-muted)]">
                  Ou cole/edite uma transcrição manualmente
                </span>
                <textarea
                  rows={2}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="A transcrição da sua gravação aparecerá aqui..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-sm"
                />
              </label>

              {error && (
                <p className="text-xs text-[var(--accent-terracotta)]">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--ink-primary)] text-xs font-medium hover:bg-[var(--ink-primary)] hover:text-[var(--bg-paper)] disabled:opacity-60 transition-colors"
              >
                <AudioWaveform className="w-4 h-4" />
                {loading ? "Analisando..." : "Analisar Transcrição"}
              </button>
            </form>
          </div>

          {analysis && (
            <div className="space-y-4 animate-studio-in">
              <div className="editorial-card p-5 flex items-center justify-between">
                <div>
                  <p className="font-mono-tech text-xs uppercase text-[var(--ink-muted)]">
                    Índice de Inteligibilidade (separado da nota CEFR)
                  </p>
                  <p className="font-display text-3xl font-semibold mt-1">
                    {analysis.intelligibilityScore}/100
                  </p>
                </div>
                <span className="font-mono-tech text-xs px-3 py-1 rounded-full bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]">
                  {analysis.priorityIssues.length} alvo(s) prioritário(s)
                </span>
              </div>

              {analysis.priorityIssues.map((issue) => (
                <PhoneticCard
                  key={`${issue.targetId}-${issue.word}`}
                  observed={issue.observedForm}
                  targetWord={issue.word}
                  ipa={issue.ipaTarget}
                  minimalPair={issue.minimalPair}
                  tip={issue.explanationPt}
                  practiceSentence={selectedDrill.targetPhrase}
                />
              ))}

              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-start gap-2.5 text-xs text-[var(--ink-secondary)]">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-emerald)] shrink-0 mt-0.5" />
                <span>{analysis.privacyNotice}</span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="editorial-card p-5 space-y-2 text-xs text-[var(--ink-muted)]">
            <p className="font-mono-tech uppercase text-[var(--ink-primary)]">
              Template de Pronúncia (18 min)
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Diagnóstico (2 min) — gravar palavras-alvo</li>
              <li>Percepção (3 min) — distinguir pares mínimos</li>
              <li>Articulação (3 min) — explicação contrastiva PT-BR</li>
              <li>Produção controlada (3 min) — palavra → frase</li>
              <li>Feedback seletivo (2 min) — apenas característica-alvo</li>
              <li>Transferência (3 min) — responder pergunta espontânea</li>
              <li>Delayed seed (2 min) — agendar retorno no SRS</li>
            </ol>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
