import { useEffect, useState } from "react";
import { CredentialRequest, IDKitSessionWidget, type RpContext } from "@worldcoin/idkit";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { label: string; presence?: boolean; onVerified: () => Promise<void> | void };

export function WorldIdButton({ label, presence = false, onVerified }: Props) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<RpContext | null>(null);
  const [error, setError] = useState("");

  async function prepare() {
    try {
      setError("");
      const response = await fetch("/api/rp-signature", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not prepare World ID");
      setContext({ rp_id: data.rp_id, nonce: data.nonce, created_at: data.created_at, expires_at: data.expires_at, signature: data.sig });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not prepare World ID");
    }
  }

  useEffect(() => { void prepare(); }, []);

  return (
    <div className="grid gap-3">
      <Button size="lg" disabled={!context} onClick={() => setOpen(true)} className="h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90">
        {context ? <Fingerprint className="size-5" /> : <LoaderCircle className="size-5 animate-spin" />}
        {context ? label : "Preparing secure sign in…"}
      </Button>
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
      {context && (
        <IDKitSessionWidget
          open={open}
          onOpenChange={(value) => { setOpen(value); if (!value) void prepare(); }}
          app_id={import.meta.env.VITE_WORLD_APP_ID}
          rp_context={context}
          environment={import.meta.env.VITE_WORLD_ENV ?? "staging"}
          require_user_presence={presence}
          constraints={CredentialRequest("proof_of_human")}
          handleVerify={async (result) => {
            const response = await fetch("/api/verify-proof", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idkitResponse: result, requireUserPresence: presence }) });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error ?? "World ID rejected");
          }}
          onSuccess={async () => { setOpen(false); await onVerified(); }}
          onError={(code) => setError(`World ID verification failed: ${code}`)}
        />
      )}
    </div>
  );
}
