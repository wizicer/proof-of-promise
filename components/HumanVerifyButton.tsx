"use client";
import { useEffect, useState } from "react";
import { IDKitRequestWidget, proofOfHuman, type RpContext } from "@worldcoin/idkit";

type Props = {
  label: string;
  action: string;
  signal: string;
  onVerified: (proof: any) => Promise<void>;
};

export default function HumanVerifyButton({ label, action, signal, onVerified }: Props) {
  const [open, setOpen] = useState(false);
  const [rp, setRp] = useState<RpContext | null>(null);
  const [error, setError] = useState("");
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || "app_demo";

  useEffect(() => {
    if (demo) return;
    fetch("/api/rp-signature", {
      method:"POST", headers:{"content-type":"application/json"},
      body:JSON.stringify({action})
    }).then(async r => {
      if (!r.ok) throw new Error("Could not create World ID request");
      const s = await r.json();
      setRp({rp_id:s.rp_id, nonce:s.nonce, created_at:s.created_at, expires_at:s.expires_at, signature:s.sig});
    }).catch(e=>setError(e.message));
  }, [action, demo]);

  async function demoVerify() {
    const fake = { protocol_version:"demo", action, responses:[{identifier:"proof_of_human", nullifier:`demo-${crypto.randomUUID()}`}] };
    await onVerified(fake);
  }

  if (demo) return <div className="actions">
    <button className="btn primary" onClick={demoVerify}>{label}</button>
    <span className="tiny">Demo mode · World ID UI bypassed</span>
  </div>;

  if (!rp) return <div className="actions"><button className="btn primary" disabled>Preparing World ID…</button>{error && <div className="error">{error}</div>}</div>;

  return <>
    <div className="actions"><button className="btn primary" onClick={()=>setOpen(true)}>{label}</button></div>
    <IDKitRequestWidget
      open={open}
      onOpenChange={setOpen}
      app_id={appId as any}
      action={action}
      rp_context={rp}
      allow_legacy_proofs={true}
      environment={(process.env.NEXT_PUBLIC_WORLD_ENV || "staging") as any}
      preset={proofOfHuman({signal})}
      handleVerify={async result => {
        const response = await fetch("/api/verify-proof", {
          method:"POST", headers:{"content-type":"application/json"},
          body:JSON.stringify({idkitResponse:result})
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