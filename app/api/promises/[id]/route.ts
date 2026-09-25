import { NextResponse } from "next/server";
import { currentPerson, getPromise } from "@/lib/store";
export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const p=getPromise(id,await currentPerson());
  return p?NextResponse.json(p):NextResponse.json({error:"Not found"},{status:404});
}
