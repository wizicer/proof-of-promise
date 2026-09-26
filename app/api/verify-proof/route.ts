import { NextResponse } from "next/server";
import { consumeChallenge, login, loginBySession, setSessionCookie } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { idkitResponse: proof, requireUserPresence } = await req.json().catch(() => ({}));
  if (!proof || typeof proof.nonce !== "string") {
    return NextResponse.json({ error: "Invalid proof context" }, { status: 400 });
  }

  const rpId = process.env.WORLD_RP_ID;
  if (!rpId) {
    return NextResponse.json({ error: "World RP configuration missing" }, { status: 500 });
  }

  // Forward the proof directly to World verification endpoint
  const response = await fetch(`https://developer.world.org/api/v4/verify/${rpId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(proof)
  });

  const data = await response.json().catch(() => ({}));
  const expectedEnv = process.env.NEXT_PUBLIC_WORLD_ENV || "production";

  if (!response.ok || data.success !== true || data.environment !== expectedEnv) {
    console.error("World ID verification failed:", { status: response.status, data, expectedEnv });
    return NextResponse.json({ error: data.error || data.detail || "World ID verification failed" }, { status: 400 });
  }

  if (requireUserPresence === true && proof.user_presence_completed !== true) {
    return NextResponse.json({ error: "Live check incomplete" }, { status: 400 });
  }

  // Verify challenge nonce
  const action = proof.action || "";
  if (!await consumeChallenge(proof.nonce, action)) {
    return NextResponse.json({ error: "Proof request expired or already used" }, { status: 409 });
  }

  // Check if this is a Session Proof (recommended sign-in flow)
  const sessionId = proof.session_id || data.session_id;
  if (sessionId && typeof sessionId === "string") {
    const { token } = await loginBySession(sessionId);
    await setSessionCookie(token);
    return NextResponse.json({ success: true, session_id: sessionId });
  }

  // Otherwise handle uniqueness proof with nullifier fallback
  const nullifier = data.nullifier || data.results?.find((r: { identifier: string; success: boolean; nullifier?: string }) => r.identifier === "proof_of_human" && r.success)?.nullifier;
  if (typeof nullifier === "string" && /^0x[0-9a-fA-F]{64}$/.test(nullifier)) {
    const { token } = await login(BigInt(nullifier).toString(10));
    await setSessionCookie(token);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No verified session_id or nullifier received" }, { status: 400 });
}
