import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";

export async function POST(req:Request) {
  const {action}=await req.json();
  const key=process.env.WORLD_RP_SIGNING_KEY;
  const rpId=process.env.WORLD_RP_ID;
  if(!key || !rpId) return NextResponse.json({error:"World RP env vars are missing"},{status:500});
  const {sig,nonce,createdAt,expiresAt}=signRequest({signingKeyHex:key,action});
  return NextResponse.json({rp_id:rpId,sig,nonce,created_at:createdAt,expires_at:expiresAt});
}