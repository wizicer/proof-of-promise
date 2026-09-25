import { NextResponse } from "next/server";
import { createPromise, currentPerson, listPromises } from "@/lib/store";
export const runtime="nodejs";
export async function GET(){const person=await currentPerson();return person?NextResponse.json(listPromises(person)):NextResponse.json({error:"Verify World ID first"},{status:401});}
export async function POST(req:Request){
  const person=await currentPerson();if(!person)return NextResponse.json({error:"Verify World ID first"},{status:401});
  const {item,deadline,note}=await req.json().catch(()=>({}));
  if(typeof item!=="string"||!item.trim()||item.length>80||typeof deadline!=="string"||!Number.isFinite(Date.parse(deadline))||Date.parse(deadline)<=Date.now()||typeof note!=="string"||note.length>240)return NextResponse.json({error:"Enter an item, future deadline and valid note"},{status:400});
  return NextResponse.json(createPromise(person,item.trim(),new Date(deadline).toISOString(),note.trim()),{status:201});
}
