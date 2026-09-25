import { NextResponse } from "next/server";
import { getPromise, putPromise } from "@/lib/store";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const p=getPromise(id);
  if(!p) return NextResponse.json({error:"Not found"},{status:404});
  if(p.status!=="RETURN_REQUESTED") return NextResponse.json({error:"Return has not been requested"},{status:409});
  p.status="FULFILLED"; p.fulfilledAt=new Date().toISOString(); putPromise(p); return NextResponse.json(p);
}