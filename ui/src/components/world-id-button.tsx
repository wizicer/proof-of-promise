import { useState } from "react";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { label: string; onVerified?: () => Promise<void> | void };

export function WorldIdButton({ label }: Props) {
  const [loading, setLoading] = useState(false);

  const startLogin = () => {
    setLoading(true);
    window.location.href = "/api/auth/world-id";
  };

  return (
    <div className="grid gap-3">
      <Button
        size="lg"
        disabled={loading}
        onClick={startLogin}
        className="h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-semibold cursor-pointer"
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : <Fingerprint className="size-5" />}
        {loading ? "Connecting to World ID…" : label}
      </Button>
    </div>
  );
}
