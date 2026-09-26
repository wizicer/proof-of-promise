import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, LoaderCircle, QrCode, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function promiseIdFromCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const match = new URL(trimmed).pathname.match(/^\/p\/([a-zA-Z0-9_-]{6,100})\/?$/);
      return match?.[1] ?? null;
    }
  } catch {
    return null;
  }
  const id = trimmed.replace(/^#/, "");
  return /^[a-zA-Z0-9_-]{6,100}$/.test(id) ? id : null;
}

export function ScanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState("");
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraSessionRef = useRef(0);

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setCameraLoading(false);
  }, []);

  const openPromise = useCallback((code: string, source: "camera" | "manual") => {
    const id = promiseIdFromCode(code);
    if (!id) {
      setError(source === "camera" ? "That QR code is not a valid Promise link" : "Enter a valid Promise link or ID");
      return false;
    }
    stopCamera();
    setError("");
    setInputVal("");
    onClose();
    navigate(`/p/${id}`);
    return true;
  }, [navigate, onClose, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning requires HTTPS or localhost and a supported browser");
      return;
    }

    const session = cameraSessionRef.current;
    setCameraLoading(true);
    try {
      const { default: jsQR } = await import("jsqr");
      if (session !== cameraSessionRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (session !== cameraSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play();
      if (session !== cameraSessionRef.current) return;
      setCameraActive(true);
      setCameraLoading(false);

      const scanFrame = () => {
        if (session !== cameraSessionRef.current) return;
        const canvas = canvasRef.current;
        if (canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
            if (result?.data && openPromise(result.data, "camera")) return;
          }
        }
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      };
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (reason) {
      if (session !== cameraSessionRef.current) return;
      stopCamera();
      setError(reason instanceof Error ? `Camera unavailable: ${reason.message}` : "Unable to access the camera");
    }
  }, [openPromise, stopCamera]);

  useEffect(() => {
    if (open) void startCamera();
    else stopCamera();
    return stopCamera;
  }, [open, startCamera, stopCamera]);

  if (!open) return null;

  function handleClose() {
    stopCamera();
    setError("");
    setInputVal("");
    onClose();
  }

  function handleGo(e: FormEvent) {
    e.preventDefault();
    openPromise(inputVal, "manual");
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="scan-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[1.75rem] border bg-background p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-2">
          <div id="scan-title" className="flex items-center gap-2 font-bold"><Scan className="size-5 text-primary" /><span>Scan to Promise</span></div>
          <Button variant="ghost" size="sm" onClick={handleClose}>Close</Button>
        </div>

        <div className="relative my-3 aspect-square w-full overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-black/90">
          <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" className={`size-full object-cover ${cameraActive ? "block" : "hidden"}`} />
          <canvas ref={canvasRef} className="hidden" />
          {cameraLoading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80"><LoaderCircle className="size-8 animate-spin text-primary" /><p className="text-xs font-semibold">Starting camera…</p></div>}
          {!cameraActive && !cameraLoading && <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center"><QrCode className="size-12 animate-pulse text-primary/70" /><p className="mt-2 text-xs font-semibold text-muted-foreground">Camera is offline</p><Button type="button" size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => void startCamera()}><Camera className="size-4" />Enable Camera</Button></div>}
          {cameraActive && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="size-48 animate-pulse rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" /></div>}
        </div>

        <form onSubmit={handleGo} className="grid gap-2">
          <div>
            <Label htmlFor="scan-code" className="text-xs">Or paste link / code manually</Label>
            <Input id="scan-code" placeholder="e.g. https://.../p/abc123 or abc123" value={inputVal} onChange={(e) => setInputVal(e.target.value)} className="mt-1 h-9 rounded-xl text-xs" />
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="h-9 rounded-xl"><ArrowRight className="size-4" />Open Item</Button>
        </form>
      </div>
    </div>
  );
}
