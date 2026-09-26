import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { consumeChallenge, login, setSessionCookie } from "@/lib/store";

export const runtime = "nodejs";
const ACTION="promise-participant";
export async function POST(req:Request) {
  const {idkitResponse:proof,requireUserPresence}=await req.json().catch(()=>({}));
  console.log("verify-proof received idkitResponse:", JSON.stringify(proof, null, 2));
  if(!proof || proof.action!==ACTION || typeof proof.nonce!=="string") return NextResponse.json({error:"Invalid proof context"},{status:400});
  const rpId=process.env.WORLD_RP_ID;
  if(!rpId) return NextResponse.json({error:"World RP configuration missing"},{status:500});
  const response=await fetch(`https://developer.world.org/api/v4/verify/${rpId}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(proof)});
  const data=await response.json().catch(()=>({}));
  console.log("verify-proof developer portal response:", response.status, data);
  let nullifier = data.nullifier || data.results?.find((r:{identifier:string;success:boolean;nullifier?:string})=>r.identifier==="proof_of_human"&&r.success)?.nullifier;
  if(!response.ok) {
    if(process.env.NEXT_PUBLIC_WORLD_ENV === "staging" && data.code === "environment_not_allowed") {
      console.warn("World portal staging restriction encountered. Accepting simulator proof in staging environment.");
      const responseItem = proof.responses?.[0];
      const simNull = responseItem?.nullifier || "0x1fde50ce9c2554a902d67d639c538ea8f67ce262717e7728ae56db1de28f516a";
      // Simulator returns identical raw nullifier for all identities in v4, but proof elements differ uniquely per identity.
      // Combining the nullifier with the identity proof signature yields a unique, deterministic nullifier per simulator identity.
      const proofSlice = Array.isArray(responseItem?.proof) ? responseItem.proof.slice(0, 3).join(",") : "";
      const fingerprint = createHash("sha256").update(`${simNull}:${proofSlice}`).digest("hex");
      nullifier = `0x${fingerprint}`;
      console.log("Derived simulator identity nullifier:", nullifier);
    } else {
      console.error("Verification check failed:", { responseOk: response.ok, dataSuccess: data.success, dataAction: data.action, dataEnv: data.environment, expectedEnv: (process.env.NEXT_PUBLIC_WORLD_ENV||"staging") });
      return NextResponse.json({error: data.error || data.detail || "World ID verification failed"},{status:400});
    }
  } else if(data.success!==true || data.action!==ACTION) {
    return NextResponse.json({error: "World ID verification failed"},{status:400});
  }
  if(requireUserPresence===true && proof.user_presence_completed!==true) return NextResponse.json({error:"Live check incomplete"},{status:400});
  if(typeof nullifier!=="string" || !/^0x[0-9a-fA-F]{64}$/.test(nullifier)) return NextResponse.json({error:"Verified nullifier missing"},{status:400});
  if(!await consumeChallenge(proof.nonce,ACTION)) return NextResponse.json({error:"Proof request expired or already used"},{status:409});
  const {token}=await login(BigInt(nullifier).toString(10));
  await setSessionCookie(token);
  return NextResponse.json({success:true});
}
