"use client";
import { useEffect, useState } from "react";
import { IDKitSessionWidget, CredentialRequest, type RpContext } from "@worldcoin/idkit";
import { usePresenceMode } from "@/components/PresenceMode";

type Props = { label: string; onVerified: () => Promise<void> | void };

export default function HumanVerifyButton({ label, onVerified }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [rp, setRp] = useState<RpContext | null>(null);
  const presence = usePresenceMode();
  const [requestedPresence, setRequestedPresence] = useState(false);

  // Fetch session proof RP signature without action (session-proofs)
  async function fetchSignature() {
    try {
      const res = await fetch("/api/rp-signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}) // Session proofs do not take an action
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not prepare World ID");
      setRp({
        rp_id: data.rp_id,
        nonce: data.nonce,
        created_at: data.created_at,
        expires_at: data.expires_at,
        signature: data.sig
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not prepare World ID");
    }
  }

  useEffect(() => {
    fetchSignature();
  }, []);

  const handleClick = () => {
    setRequestedPresence(presence);
    setError("");
    setOpen(true);
  };

  return (
    <div className="actions">
      <button className="btn primary" disabled={!rp} onClick={handleClick}>
        {rp ? label : "Preparing World ID…"}
      </button>
      {error && <p className="error">{error}</p>}
      {rp && (
        <IDKitSessionWidget
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              // Refresh signature for next verification attempt
              fetchSignature();
            }
          }}
          app_id={process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`}
          rp_context={rp}
          environment={(process.env.NEXT_PUBLIC_WORLD_ENV || "staging") as "production" | "staging"}
          require_user_presence={requestedPresence}
          constraints={CredentialRequest("proof_of_human")}
          handleVerify={async (result) => {
            console.log("[HumanVerifyButton] handleVerify called with result:", result);
            const r = await fetch("/api/verify-proof", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                idkitResponse: result,
                requireUserPresence: requestedPresence
              })
            });
            if (!r.ok) {
              const data = await r.json().catch(() => ({}));
              console.error("[HumanVerifyButton] backend /api/verify-proof returned error:", data);
              throw new Error(data.error || "World ID rejected");
            }
          }}
          onSuccess={async () => {
            console.log("[HumanVerifyButton] verification succeeded");
            setOpen(false);
            await onVerified();
          }}
          onError={(errCode, debugReport) => {
            console.error("[HumanVerifyButton] onError triggered:", errCode, debugReport);
            setError(`World ID verification failed: ${errCode}`);
          }}
        />
      )}
    </div>
  );
}
