import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      email: session.email,
      displayName: session.displayName,
      pseudonymId: session.pseudonymId,
    },
  });
}
