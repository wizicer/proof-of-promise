import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, QrCode, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ScanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function handleGo(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) { setError("Please enter a code or link"); return; }
    // Check if full URL or just promise ID
    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const url = new URL(trimmed);
        const match = url.pathname.match(/\/p\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          navigate(`/p/${match[1]}`);
          onClose();
          return;
        }
      }
      // If it's a bare promise ID
      const cleaned = trimmed.replace(/^#/, "");
      navigate(`/p/${cleaned}`);
      onClose();
    } catch {
      setError("Invalid promise link or ID");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[1.75rem] border bg-background p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2 font-bold"><Scan className="size-5 text-primary" /><span>Scan to Promise</span></div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="my-3 grid place-items-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 py-8 text-center">
          <QrCode className="size-12 text-primary/70 animate-pulse" />
          <p className="mt-2 text-xs font-semibold text-muted-foreground">Scan merchant item QR code</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">Or paste the item link / code below</p>
        </div>
        <form onSubmit={handleGo} className="grid gap-3">
          <div>
            <Label htmlFor="scan-code" className="text-xs">QR Link or Promise ID</Label>
            <Input id="scan-code" autoFocus placeholder="e.g. https://.../p/abc123 or abc123" value={inputVal} onChange={(e) => setInputVal(e.target.value)} className="mt-1 h-10 rounded-xl" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="h-11 rounded-xl"><ArrowRight className="size-4" />Open Item</Button>
        </form>
      </div>
    </div>
  );
}
