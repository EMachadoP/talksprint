import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/lib/db/postgres-repository";
import { hasGeminiKey } from "@/lib/ai/gemini";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "talksprint",
    storage: hasDatabaseUrl() ? "neon-postgresql" : "ephemeral-fallback",
    aiProvider: hasGeminiKey() ? "gemini-3.1-flash-lite" : "deterministic-fallback",
    timestamp: new Date().toISOString(),
  });
}
