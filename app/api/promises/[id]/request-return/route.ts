import { NextResponse } from "next/server";
import { getPromise, putPromise } from "@/lib/store";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const p=getPromise(id);
  if(!p) return NextResponse.json({error:"Not found"},{status:404});
  if(p.status!=="ACTIVE") return NextResponse.json({error:"Promise is not active"},{status:409});
  p.status="RETURN_REQUESTED"; putPromise(p); return NextResponse.json(p);
}