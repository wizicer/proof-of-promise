import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";
import { createChallenge } from "@/lib/store";

export const runtime = "nodejs";
const ACTION = "promise-participant";
export async function POST() {
  const key=process.env.WORLD_RP_SIGNING_KEY, rpId=process.env.WORLD_RP_ID;
  if(!key||!rpId) return NextResponse.json({error:"World RP configuration missing"},{status:500});
  const {sig,nonce,createdAt,expiresAt}=signRequest({signingKeyHex:key,action:ACTION});
  createChallenge(nonce,ACTION,expiresAt);
  return NextResponse.json({rp_id:rpId,sig,nonce,created_at:createdAt,expires_at:expiresAt,action:ACTION});
}
