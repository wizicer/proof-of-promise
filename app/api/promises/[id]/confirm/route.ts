import { NextResponse } from "next/server";
import { currentPerson, transition } from "@/lib/store";
export const runtime="nodejs";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const person=await currentPerson();if(!person)return NextResponse.json({error:"Verify World ID first"},{status:401});return await transition((await params).id,"RETURN_REQUESTED","FULFILLED",person,"lender")?NextResponse.json({success:true}):NextResponse.json({error:"Only the lender can confirm return"},{status:409});}
