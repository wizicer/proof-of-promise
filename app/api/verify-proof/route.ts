import { NextResponse } from "next/server";

export async function POST(req:Request) {
  if(process.env.NEXT_PUBLIC_DEMO_MODE==="true") return NextResponse.json({success:true,demo:true});
  const {idkitResponse,requireUserPresence}=await req.json();
  const rpId=process.env.WORLD_RP_ID;
  if(!rpId) return NextResponse.json({error:"WORLD_RP_ID missing"},{status:500});
  const response=await fetch(`https://developer.world.org/api/v4/verify/${rpId}`,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(idkitResponse)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) {
    console.error("World ID verification rejected", {status:response.status, details:data});
    return NextResponse.json({error:"Verification failed",details:data},{status:400});
  }
  if(data.environment && data.environment !== (process.env.NEXT_PUBLIC_WORLD_ENV || "staging"))
    return NextResponse.json({error:"World ID environment mismatch"},{status:400});
  if(requireUserPresence === true && idkitResponse?.user_presence_completed !== true)
    return NextResponse.json({error:"World ID user presence check was not completed"},{status:400});
  return NextResponse.json({success:true,verification:data});
}
