const GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3-flash-preview"] as const;

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
}

export async function callGeminiJson<T>(
  systemInstruction: string,
  userParts: GeminiPart[],
  temperature = 0.4
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: userParts,
            },
          ],
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(18_000),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      return JSON.parse(rawText) as T;
    } catch {
      continue;
    }
  }

  return null;
}
