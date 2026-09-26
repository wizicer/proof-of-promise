import { NextResponse } from "next/server";
import { consumeChallenge, login, loginBySession, setSessionCookie } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { idkitResponse: proof, requireUserPresence } = body;

  console.log("--> [verify-proof] Incoming request body:", JSON.stringify(body, null, 2));

  if (!proof || typeof proof.nonce !== "string") {
    console.error("--> [verify-proof] Invalid proof context:", proof);
    return NextResponse.json({ error: "Invalid proof context" }, { status: 400 });
  }

  const rpId = process.env.WORLD_RP_ID;
  if (!rpId) {
    console.error("--> [verify-proof] World RP configuration missing");
    return NextResponse.json({ error: "World RP configuration missing" }, { status: 500 });
  }

  let response: Response;
  try {
    console.log(`--> [verify-proof] Forwarding proof to https://developer.world.org/api/v4/verify/${rpId}`);
    response = await fetch(`https://developer.world.org/api/v4/verify/${rpId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(proof)
    });
  } catch (err: unknown) {
    console.error("--> [verify-proof] Network fetch to World API failed:", err);
    return NextResponse.json({ 
      error: `Network error connecting to World API: ${err instanceof Error ? err.message : String(err)}` 
    }, { status: 502 });
  }

  const data = await response.json().catch(() => ({}));
  const expectedEnv = process.env.NEXT_PUBLIC_WORLD_ENV || "production";

  console.log("--> [verify-proof] World API response status:", response.status);
  console.log("--> [verify-proof] World API response body:", JSON.stringify(data, null, 2));

  if (!response.ok || data.success !== true || data.environment !== expectedEnv) {
    console.error("--> [verify-proof] World ID verification failed:", {
      status: response.status,
      data,
      expectedEnv
    });
    return NextResponse.json({
      error: data.error || data.detail || `World ID verification failed (${response.status})`,
      details: data
    }, { status: 400 });
  }

  if (requireUserPresence === true && proof.user_presence_completed !== true) {
    console.warn("--> [verify-proof] Live check incomplete");
    return NextResponse.json({ error: "Live check incomplete" }, { status: 400 });
  }

  // Verify challenge nonce
  const action = proof.action || "";
  const challengeValid = await consumeChallenge(proof.nonce, action);
  if (!challengeValid) {
    console.error("--> [verify-proof] Proof request expired or already used for nonce:", proof.nonce);
    return NextResponse.json({ error: "Proof request expired or already used" }, { status: 409 });
  }

  // Check if this is a Session Proof (recommended sign-in flow)
  const sessionId = proof.session_id || data.session_id;
  if (sessionId && typeof sessionId === "string") {
    console.log("--> [verify-proof] Verified session proof, session_id:", sessionId);
    const { token } = await loginBySession(sessionId);
    await setSessionCookie(token);
    return NextResponse.json({ success: true, session_id: sessionId });
  }

  // Otherwise handle uniqueness proof with nullifier fallback
  const nullifier = data.nullifier || data.results?.find((r: { identifier: string; success: boolean; nullifier?: string }) => r.identifier === "proof_of_human" && r.success)?.nullifier;
  if (typeof nullifier === "string" && /^0x[0-9a-fA-F]{64}$/.test(nullifier)) {
    console.log("--> [verify-proof] Verified uniqueness proof, nullifier:", nullifier);
    const { token } = await login(BigInt(nullifier).toString(10));
    await setSessionCookie(token);
    return NextResponse.json({ success: true });
  }

  console.error("--> [verify-proof] No verified session_id or nullifier received:", data);
  return NextResponse.json({ error: "No verified session_id or nullifier received" }, { status: 400 });
}
