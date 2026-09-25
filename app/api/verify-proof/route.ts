import { NextResponse } from "next/server";
import { consumeChallenge, login, setSessionCookie } from "@/lib/store";

export const runtime = "nodejs";
const ACTION="promise-participant";
export async function POST(req:Request) {
  const {idkitResponse:proof,requireUserPresence}=await req.json().catch(()=>({}));
  if(!proof || proof.action!==ACTION || typeof proof.nonce!=="string") return NextResponse.json({error:"Invalid proof context"},{status:400});
  const rpId=process.env.WORLD_RP_ID;
  if(!rpId) return NextResponse.json({error:"World RP configuration missing"},{status:500});
  const response=await fetch(`https://developer.world.org/api/v4/verify/${rpId}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(proof)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok || data.success!==true || data.action!==ACTION || data.environment!==(process.env.NEXT_PUBLIC_WORLD_ENV||"staging")) return NextResponse.json({error:"World ID verification failed"},{status:400});
  if(requireUserPresence===true && proof.user_presence_completed!==true) return NextResponse.json({error:"Live check incomplete"},{status:400});
  const nullifier=data.nullifier || data.results?.find((r:{identifier:string;success:boolean;nullifier?:string})=>r.identifier==="proof_of_human"&&r.success)?.nullifier;
  if(typeof nullifier!=="string" || !/^0x[0-9a-fA-F]{64}$/.test(nullifier)) return NextResponse.json({error:"Verified nullifier missing"},{status:400});
  if(!await consumeChallenge(proof.nonce,ACTION)) return NextResponse.json({error:"Proof request expired or already used"},{status:409});
  const {token}=await login(BigInt(nullifier).toString(10));
  await setSessionCookie(token);
  return NextResponse.json({success:true});
}
