import { NextResponse } from "next/server";
import { putPromise } from "@/lib/store";

export async function POST(req: Request) {
  const {item, deadline, note} = await req.json();
  if (!item || !deadline) return NextResponse.json({error:"Item and deadline are required"}, {status:400});
  const id = crypto.randomUUID();
  putPromise({id,item:String(item).slice(0,100),deadline,note:String(note||"").slice(0,300),createdAt:new Date().toISOString(),status:"OPEN"});
  return NextResponse.json({id});
}