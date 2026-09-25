"use client";
import { useEffect, useState } from "react";
import { IDKitRequestWidget, proofOfHuman, type RpContext } from "@worldcoin/idkit";
import { usePresenceMode } from "@/components/PresenceMode";

type Props={label:string;onVerified:()=>Promise<void>|void};
export default function HumanVerifyButton({label,onVerified}:Props){
  const [open,setOpen]=useState(false),[error,setError]=useState("");
  const [rp,setRp]=useState<RpContext|null>(null);
  const presence=usePresenceMode(),[requestedPresence,setRequestedPresence]=useState(false);
  const demo=process.env.NEXT_PUBLIC_DEMO_MODE==="true";
  useEffect(()=>{if(demo)return;let cancelled=false;fetch("/api/rp-signature",{method:"POST"}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not prepare World ID");if(!cancelled)setRp({rp_id:data.rp_id,nonce:data.nonce,created_at:data.created_at,expires_at:data.expires_at,signature:data.sig});}).catch(e=>{if(!cancelled)setError(e.message)});return()=>{cancelled=true}},[demo]);
  async function demoLogin(){const r=await fetch("/api/verify-proof",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});if(!r.ok)throw new Error("Demo sign in failed");await onVerified();}
  if(demo)return <div className="actions"><button className="btn primary" onClick={()=>demoLogin().catch(e=>setError(e.message))}>{label}</button>{error&&<p className="error">{error}</p>}<small className="tiny">Demo account is separate for each browser profile.</small></div>;
  return <div className="actions"><button className="btn primary" disabled={!rp} onClick={()=>{setRequestedPresence(presence);setOpen(true)}}>{rp?label:"Preparing World ID…"}</button>{error&&<p className="error">{error}</p>}
    {rp&&<IDKitRequestWidget open={open} onOpenChange={setOpen} app_id={process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`} action="promise-participant" rp_context={rp} environment={(process.env.NEXT_PUBLIC_WORLD_ENV||"staging") as "production"|"staging"} allow_legacy_proofs={true} require_user_presence={requestedPresence} preset={proofOfHuman()}
      handleVerify={async result=>{const r=await fetch("/api/verify-proof",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idkitResponse:result,requireUserPresence:requestedPresence})});if(!r.ok){const data=await r.json().catch(()=>({}));throw new Error(data.error||"World ID rejected")}}}
      onSuccess={async()=>{setOpen(false);await onVerified()}} onError={()=>setError("World ID verification was not completed.")}/>}
  </div>;
}
