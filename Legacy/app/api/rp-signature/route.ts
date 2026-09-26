import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";
import { createChallenge } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = process.env.WORLD_RP_SIGNING_KEY;
  const rpId = process.env.WORLD_RP_ID;
  if (!key || !rpId) return NextResponse.json({ error: "World RP configuration missing" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" && body.action ? body.action : undefined;

  // Session proof signing requests do NOT take an action (see https://docs.world.org/world-id/idkit/session-proofs)
  const { sig, nonce, createdAt, expiresAt } = signRequest(
    action ? { signingKeyHex: key, action } : { signingKeyHex: key }
  );

  await createChallenge(nonce, action || "", expiresAt);
  return NextResponse.json({ rp_id: rpId, sig, nonce, created_at: createdAt, expires_at: expiresAt, action });
}
