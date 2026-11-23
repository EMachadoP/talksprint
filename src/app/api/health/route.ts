import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "talksprint",
    storage: process.env.DATABASE_URL ? "postgresql" : "resilient-memory",
    timestamp: new Date().toISOString(),
  });
}
