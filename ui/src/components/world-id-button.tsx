import { useCallback, useEffect, useState } from "react";
import { CredentialRequest, IDKitSessionWidget, setDebug, type IDKitDebugReport, type IDKitErrorCodes, type RpContext } from "@worldcoin/idkit";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { label: string; presence?: boolean; onVerified: () => Promise<void> | void };
type DiagnosticError = { message: string; code?: string; requestId?: string };

if (import.meta.env.DEV) setDebug(true);

function safeDebugReport(report?: IDKitDebugReport) {
  if (!report) return undefined;
  return { requestId: report.request_id, transport: report.transport, sdkVersion: report.package_version, generatedAt: report.generated_at };
}

export function WorldIdButton({ label, presence = false, onVerified }: Props) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<RpContext | null>(null);
  const [error, setError] = useState<DiagnosticError | null>(null);

  const prepare = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/rp-signature", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError({ message: data.error ?? "Could not prepare World ID", requestId: response.headers.get("x-request-id") ?? undefined });
        return;
      }
      setContext({ rp_id: data.rp_id, nonce: data.nonce, created_at: data.created_at, expires_at: data.expires_at, signature: data.sig });
    } catch (reason) {
      setError({ message: reason instanceof Error ? reason.message : "Could not prepare World ID", code: "network_error" });
    }
  }, []);

  useEffect(() => { void prepare(); }, [prepare]);

  const shared = {
    open,
    onOpenChange: (value: boolean) => { setOpen(value); if (!value) void prepare(); },
    app_id: import.meta.env.VITE_WORLD_APP_ID,
    rp_context: context!,
    environment: (import.meta.env.VITE_WORLD_ENV ?? "staging") as "production" | "staging" | "sandbox",
    require_user_presence: presence,
    constraints: CredentialRequest("proof_of_human"),
    handleVerify: async (result: unknown) => {
      try {
        const response = await fetch("/api/verify-proof", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idkitResponse: result, requireUserPresence: presence }) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const requestId = response.headers.get("x-request-id") ?? body.requestId;
          setError({ message: body.error ?? "World ID rejected", code: "host_verification_failed", requestId });
          console.error("[World ID] Host verification failed", { status: response.status, requestId });
          throw new Error(body.error ?? "World ID rejected");
        }
      } catch (reason) {
        if (reason instanceof TypeError) setError({ message: "Could not reach the verification server", code: "network_error" });
        throw reason;
      }
    },
    onSuccess: async () => { setOpen(false); await onVerified(); },
    onError: (code: IDKitErrorCodes, debugReport?: IDKitDebugReport) => {
      const report = safeDebugReport(debugReport);
      console.error("[World ID] Verification flow failed", { code, ...report });
      setError({ message: "World ID could not complete sign in", code, requestId: report?.requestId });
    },
  };

  return (
    <div className="grid gap-3">
      <Button size="lg" disabled={!context} onClick={() => setOpen(true)} className="h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90">
        {context ? <Fingerprint className="size-5" /> : <LoaderCircle className="size-5 animate-spin" />}
        {context ? label : "Preparing secure sign in…"}
      </Button>
      {error && <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive"><p>{error.message}</p>{(error.code || error.requestId) && <p className="mt-1 font-mono text-[.65rem] opacity-75">{error.code && `code: ${error.code}`}{error.code && error.requestId && " · "}{error.requestId && `diagnostic: ${error.requestId}`}</p>}</div>}
      {context && <IDKitSessionWidget {...shared} />}
    </div>
  );
}
