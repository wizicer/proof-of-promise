import { NextResponse } from "next/server";
import { getPromise, putPromise } from "@/lib/store";
import { extractNullifier } from "@/lib/world";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const p=getPromise(id);
  if(!p) return NextResponse.json({error:"Not found"},{status:404});
  if(p.status!=="OPEN" || !p.lender) return NextResponse.json({error:"Promise is not open"},{status:409});
  const body=await req.json(); const nullifier=extractNullifier(body.proof);
  if(!nullifier) return NextResponse.json({error:"Missing verified human proof"},{status:400});
  if(nullifier===p.lender.nullifier) return NextResponse.json({error:"You cannot borrow from yourself"},{status:409});
  p.borrower={nullifier,verifiedAt:new Date().toISOString()}; p.status="ACTIVE"; putPromise(p);
  return NextResponse.json(p);
}