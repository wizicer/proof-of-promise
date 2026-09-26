import { ShieldCheck } from "lucide-react";
import { WorldIdButton } from "@/components/world-id-button";

export function LoginPage({ onVerified }: { onVerified: () => Promise<void> }) {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get("auth_error");

  return (
    <main className="login-screen">
      <div className="login-orbit" aria-hidden="true"><span /><span /><span /></div>
      <section className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-8">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-tight"><span className="brand-mark"><img src="/brand-icon.png" alt="Promise" /></span> Promise</div>
        <div className="pb-8">
          <p className="eyebrow">Proof of promise</p>
          <h1 className="mt-4 text-[3.4rem] font-black leading-[.92] tracking-[-.07em]">Things move.<br /><span className="text-primary-foreground/55">Trust stays.</span></h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-primary-foreground/70">Make a clear promise with another verified person—and keep every step visible to both of you.</p>
        </div>
        <div className="rounded-[2rem] bg-background p-5 text-foreground shadow-2xl shadow-black/20">
          <div className="mb-5 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-primary"><ShieldCheck className="size-5" /></span><div><p className="font-bold">One human, one account</p><p className="text-sm text-muted-foreground">Private recognition by World ID</p></div></div>
          {authError && (
            <div role="alert" className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
              Authentication failed: {authError}
            </div>
          )}
          <WorldIdButton label="Continue with World ID" onVerified={onVerified} />
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Log in with World ID OAuth 2.0 to restore your account and promises on any device.</p>
        </div>
      </section>
    </main>
  );
}
