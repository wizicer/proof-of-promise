import { NextResponse } from "next/server";
import { getPromise, putPromise } from "@/lib/store";
import { extractNullifier } from "@/lib/world";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const p=getPromise(id);
  return p ? NextResponse.json(p) : NextResponse.json({error:"Not found"},{status:404});
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const p=getPromise(id);
  if(!p) return NextResponse.json({error:"Not found"},{status:404});
  const body=await req.json();
  if(body.kind!=="verify-lender") return NextResponse.json({error:"Bad action"},{status:400});
  const nullifier=extractNullifier(body.proof);
  if(!nullifier) return NextResponse.json({error:"Missing verified human proof"},{status:400});
  p.lender={nullifier,verifiedAt:new Date().toISOString()}; putPromise(p);
  return NextResponse.json(p);
}