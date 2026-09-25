"use client";
import { useEffect, useState } from "react";
import { IDKitRequestWidget, proofOfHuman, type RpContext } from "@worldcoin/idkit";
import { usePresenceMode } from "@/components/PresenceMode";

type Props = {
  label: string;
  signal: string;
  onVerified: (proof: any) => Promise<void>;
};

export default function HumanVerifyButton({ label, signal, onVerified }: Props) {
  const [open, setOpen] = useState(false);
  const [rp, setRp] = useState<RpContext | null>(null);
  const [signedAction, setSignedAction] = useState("");
  const [error, setError] = useState("");
  const presenceEnabled = usePresenceMode();
  const [requestPresence, setRequestPresence] = useState(false);
  const action = presenceEnabled ? "promise-presence-test" : "promise-standard-test";
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || "app_demo";

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    setRp(null);
    setError("");
    fetch("/api/rp-signature", {
      method:"POST", headers:{"content-type":"application/json"},
      body:JSON.stringify({action})
    }).then(async r => {
      if (!r.ok) throw new Error("Could not create World ID request");
      const s = await r.json();
      if (!cancelled) {
        setRp({rp_id:s.rp_id, nonce:s.nonce, created_at:s.created_at, expires_at:s.expires_at, signature:s.sig});
        setSignedAction(action);
      }
    }).catch(e=>{if (!cancelled) setError(e.message);});
    return () => { cancelled = true; };
  }, [action, demo]);

  async function demoVerify() {
    const fake = { protocol_version:"demo", action, responses:[{identifier:"proof_of_human", nullifier:`demo-${crypto.randomUUID()}`}] };
    await onVerified(fake);
  }

  if (demo) return <div className="actions">
    <button className="btn primary" onClick={demoVerify}>{label}</button>
    <span className="tiny">Demo mode · World ID UI bypassed</span>
  </div>;

  if (!rp || signedAction !== action) return <div className="actions"><button className="btn primary" disabled>Preparing World ID…</button>{error && <div className="error">{error}</div>}</div>;

  return <>
    <div className="actions"><button className="btn primary" onClick={()=>{setRequestPresence(presenceEnabled);setOpen(true);}}>{label}</button></div>
    <IDKitRequestWidget
      open={open}
      onOpenChange={setOpen}
      app_id={appId as any}
      action={action}
      rp_context={rp}
      allow_legacy_proofs={true}
      require_user_presence={requestPresence}
      environment={(process.env.NEXT_PUBLIC_WORLD_ENV || "staging") as any}
      preset={proofOfHuman({signal})}
      handleVerify={async result => {
        const response = await fetch("/api/verify-proof", {
          method:"POST", headers:{"content-type":"application/json"},
          body:JSON.stringify({idkitResponse:result, requireUserPresence:requestPresence})
        });
        if (!response.ok) throw new Error("World ID proof rejected");
      }}
      onSuccess={async result => {
        await onVerified(result);
        setOpen(false);
      }}
    />
  </>;
}
