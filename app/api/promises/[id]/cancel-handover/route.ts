import { NextResponse } from "next/server";
import { cancelHandover, currentPerson } from "@/lib/store";
export const runtime="nodejs";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const person=await currentPerson();if(!person)return NextResponse.json({error:"Verify World ID first"},{status:401});return cancelHandover((await params).id,person)?NextResponse.json({success:true}):NextResponse.json({error:"Only the lender can cancel handover"},{status:409});}
