import { NextResponse } from "next/server";
import { currentPerson, joinPromise } from "@/lib/store";
export const runtime="nodejs";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const person=await currentPerson();if(!person)return NextResponse.json({error:"Verify World ID first"},{status:401});return joinPromise((await params).id,person)?NextResponse.json({success:true}):NextResponse.json({error:"Request unavailable or this is your own request"},{status:409});}
