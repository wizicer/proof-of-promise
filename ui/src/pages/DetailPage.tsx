import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck2, Check, Clock3, Copy, ExternalLink, LoaderCircle, MapPin, PackageCheck, ShieldCheck, Store } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { BorrowerHistory } from "@/components/BorrowerHistory";
import { Shell } from "@/layouts/Shell";
import { Empty } from "@/components/Empty";
import { ShowUpMap } from "@/components/show-up-map";
import { statusCopy } from "@/constants/status";
import { resolvePromiseIcon } from "@/constants/items";
import { relativeTime } from "@/utils/time";
import { api } from "@/lib/api";
import type { BorrowerHistory as BorrowerHistoryData, HumanPromise } from "@/types";

function ShowUpDetail({ promise }: { promise: HumanPromise & { showUp: NonNullable<HumanPromise["showUp"]> } }) {
  const [copied, setCopied] = useState<"link" | "agent" | null>(null);
  const details = promise.showUp;
  const shareUrl = `${location.origin}/p/${promise.id}`;
  const mcpUrl = `${location.origin}/mcp?promiseId=${encodeURIComponent(promise.id)}`;
  const windowLabel = `±${details.windowHours} ${details.windowHours === 1 ? "hour" : "hours"}`;
  const agentInstructions = `Use the Proof of Promise MCP server at ${mcpUrl} to verify this promise.`;

  async function copy(value: string, type: "link" | "agent") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied((current) => current === type ? null : current), 1_500);
  }

  return <Shell><div className="detail-page show-up-detail">
    <Link to="/activity" className="back-link"><ArrowLeft />Activity</Link>
    <section className="detail-hero show-up-detail-hero">
      <div className="flex items-center justify-between"><span className="role-tag">Committed</span><span className="text-xs text-muted-foreground">#{promise.id.slice(0, 6)}</span></div>
      <div className="detail-object"><div className="object-icon show-up-object-icon"><CalendarCheck2 /></div><div><p className="eyebrow text-muted-foreground">Promise to Show Up</p><h1>{details.centerTime} · {windowLabel}</h1></div></div>
      <div className="detail-facts"><div><Clock3 /><span><small>Expected</small>{relativeTime(promise.deadline)}</span></div><div><ShieldCheck /><span><small>Status</small>Promise committed</span></div></div>
      {promise.note && <blockquote>"{promise.note}"</blockquote>}
    </section>

    <section className="show-up-location-preview">
      <div className="show-up-card-title"><div><h2>Committed area</h2><p>1 km across · {details.timezone}</p></div><span className="map-radius-pill"><MapPin />1 km</span></div>
      <ShowUpMap value={{ lat: details.latitude, lng: details.longitude }} interactive={false} />
    </section>

    <section className="show-up-proof-card">
      <div className="proof-copy"><p className="eyebrow">Share this promise</p><h2>Let anyone verify it</h2><p>The QR code opens this committed promise and its details.</p><Button variant="outline" size="sm" onClick={() => void copy(shareUrl, "link")}><Copy />{copied === "link" ? "Copied" : "Copy link"}</Button></div>
      <div className="show-up-qr"><QRCodeSVG value={shareUrl} size={96} bgColor="transparent" fgColor="currentColor" /></div>
    </section>

    <section className="agent-handoff-card">
      <div className="agent-handoff-heading"><p>Prompt for your agent</p><a href={mcpUrl} target="_blank" rel="noreferrer">View MCP endpoint <ExternalLink /></a></div>
      <div className="agent-prompt-preview"><p>{agentInstructions}</p></div>
      <div className="agent-handoff-footer"><p>Give this prompt to your agent so it can verify the promise and take care of the next task.</p><Button onClick={() => void copy(agentInstructions, "agent")}><Copy />{copied === "agent" ? "Copied" : "Copy prompt"}</Button></div>
    </section>
  </div></Shell>;
}

export function DetailPage() {
  const { id = "" } = useParams();
  const [promise, setPromise] = useState<HumanPromise | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [borrowerHistory, setBorrowerHistory] = useState<BorrowerHistoryData | null | undefined>(undefined);
  const borrowerHistoryEligible = promise?.kind === "RETURN" && promise.status === "REQUESTED" && !promise.myRole;
  async function refresh() { try { setPromise(await api.promise(id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Promise unavailable"); } }
  useEffect(() => {
    let active = true;
    let inFlight = false;
    let immutable = false;
    async function sync(showError: boolean) {
      if (inFlight || immutable) return;
      inFlight = true;
      try {
        const value = await api.promise(id);
        if (active) {
          if (value.kind === "SHOW_UP" && value.status === "COMMITTED") immutable = true;
          setPromise((current) => current && current.status === value.status && current.myRole === value.myRole && current.fulfilledAt === value.fulfilledAt ? current : value);
          setError("");
        }
      } catch (reason) {
        if (active && showError) setError(reason instanceof Error ? reason.message : "Promise unavailable");
      } finally {
        inFlight = false;
      }
    }
    const syncWhenVisible = () => { if (document.visibilityState === "visible") void sync(false); };
    void sync(true);
    const interval = window.setInterval(syncWhenVisible, 1_500);
    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [id]);
  useEffect(() => {
    if (!borrowerHistoryEligible) {
      setBorrowerHistory(undefined);
      return;
    }
    let active = true;
    setBorrowerHistory(undefined);
    void api.borrowerHistory(id).then((value) => { if (active) setBorrowerHistory(value); }).catch(() => { if (active) setBorrowerHistory(null); });
    return () => { active = false; };
  }, [borrowerHistoryEligible, id]);
  async function act(action: string) { setBusy(true); setError(""); try { await api.act(id, action); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed"); } finally { setBusy(false); } }
  async function handleBorrowB2C() { setBusy(true); setError(""); try { await api.borrowB2C(id); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not borrow item"); } finally { setBusy(false); } }

  if (!promise) return <Shell><div className="grid min-h-[60vh] place-items-center">{error ? <Empty title="Promise unavailable" copy={error} /> : <LoaderCircle className="animate-spin" />}</div></Shell>;
  if (promise.kind === "SHOW_UP" && promise.showUp) return <ShowUpDetail promise={promise as HumanPromise & { showUp: NonNullable<HumanPromise["showUp"]> }} />;
  const shareUrl = `${location.origin}/p/${promise.id}`;
  const isBorrower = promise.myRole === "borrower";
  const isLender = promise.myRole === "lender";
  const isB2C = promise.kind === "B2C";
  const state = statusCopy[promise.status];

  let action: { title: string; copy: string; button?: string; endpoint?: string; onClick?: () => Promise<void>; secondary?: { label: string; endpoint: string } };

  if (isB2C) {
    if (promise.status === "REQUESTED") {
      if (isLender) {
        action = {
          title: "Merchant Listing Ready",
          copy: "Display this QR code for customers to scan. When they confirm on their device, borrowing starts immediately.",
        };
      } else {
        action = {
          title: `Borrow ${promise.item}?`,
          copy: `Merchant preset return duration: ${promise.durationLabel ?? relativeTime(promise.deadline)}. Tap below to confirm and borrow immediately.`,
          button: "Confirm Borrow (Immediate)",
          onClick: handleBorrowB2C,
        };
      }
    } else if (promise.status === "ACTIVE") {
      if (isLender) {
        action = {
          title: "Item Lent Out · In Use",
          copy: "Customer has borrowed the item. When they return it, inspect and confirm recovery below.",
          button: "Item Returned · Confirm Recovery",
          endpoint: "merchant-finish",
        };
      } else if (isBorrower) {
        action = {
          title: `${promise.item} is in use`,
          copy: "Borrowing credential active. When finished, hand the item back to the merchant. The merchant will confirm return on their screen.",
        };
      } else {
        action = {
          title: "Item in use",
          copy: "This item is currently borrowed by another verified human.",
        };
      }
    } else {
      action = {
        title: "Promise Kept & Returned",
        copy: "The item has been returned and confirmed by the merchant. Commitment fulfilled!",
      };
    }
  } else {
    // Normal C2C flow
    if (!isBorrower && !isLender) action = promise.status === "REQUESTED" ? { title: `Lend your ${promise.item}?`, copy: "Agree only when you are together and ready to hand it over.", button: "Agree to lend", endpoint: "lend" } : { title: "Already in motion", copy: "Another verified human is keeping this promise." };
    else if (isBorrower && promise.status === "REQUESTED") action = { title: "Find your lender", copy: "Let the lender scan this code. They will review the promise on their phone." };
    else if (isBorrower && promise.status === "HANDOVER_PENDING") action = { title: "Do you have it in hand?", copy: "Inspect the physical item first. This starts your active promise.", button: "I received the item", endpoint: "receive" };
    else if (isLender && promise.status === "HANDOVER_PENDING") action = { title: "Hand it over in person", copy: "The borrower confirms receipt on their device.", secondary: { label: "Cancel this handover", endpoint: "cancel-handover" } };
    else if (isBorrower && promise.status === "ACTIVE") action = { title: "Ready to give it back?", copy: "Hand the item back first, then ask the lender to confirm.", button: "I handed it back", endpoint: "request-return" };
    else if (isLender && promise.status === "ACTIVE") action = { title: "The item is out", copy: `The borrower promised to return it ${relativeTime(promise.deadline)}.` };
    else if (isBorrower && promise.status === "RETURN_REQUESTED") action = { title: "Waiting for their check", copy: "The lender needs to inspect and confirm the returned item.", secondary: { label: "Cancel return request", endpoint: "cancel-return" } };
    else if (isLender && promise.status === "RETURN_REQUESTED") action = { title: "Check what came back", copy: "Confirm only after the physical item is back with you.", button: "Item returned · Complete", endpoint: "confirm" };
    else action = { title: "Promise kept", copy: "Both humans completed the handover and return. Nicely done." };
  }

  const displayedDeadline = promise.durationLabel ?? relativeTime(promise.deadline);
  const DetailIcon = resolvePromiseIcon(promise.icon, isB2C ? Store : PackageCheck);
  const showBorrowerHistory = !isB2C && !isBorrower && !isLender && promise.status === "REQUESTED";
  return <Shell><div className="detail-page"><Link to="/" className="back-link"><ArrowLeft />Back</Link><section className="detail-hero"><div className="flex items-center justify-between"><span className="role-tag">{isB2C ? (isLender ? "Merchant" : isBorrower ? "Customer" : "Merchant Item") : (promise.myRole ? `You're ${promise.myRole === "borrower" ? "borrowing" : "lending"}` : "Lend request")}</span><span className="text-xs text-muted-foreground">#{promise.id.slice(0, 6)}</span></div><div className="detail-object"><div className="object-icon"><DetailIcon /></div><div><p className="eyebrow text-muted-foreground">{isB2C ? "Merchant Asset" : "The item"}</p><h1>{promise.item}</h1></div></div><div className="detail-facts"><div><Clock3 /><span><small>{isBorrower ? "Return" : "Expected back"}</small>{displayedDeadline}</span></div><div><ShieldCheck /><span><small>Status</small>{state.label}</span></div></div>{promise.note && <blockquote>"{promise.note}"</blockquote>}</section><section className="action-card" aria-live="polite"><div className="progress-track"><span className={`progress-${promise.status.toLowerCase()}`} /></div><p className="eyebrow text-muted-foreground">Right now · Live</p><h2>{action.title}</h2><p>{action.copy}</p>{((isBorrower && promise.status === "REQUESTED") || (isB2C && isLender && promise.status === "REQUESTED")) && <div className="qr-wrap"><QRCodeSVG value={shareUrl} size={104} bgColor="transparent" fgColor="currentColor" /><Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(shareUrl)}><Copy />Copy link</Button></div>}{action.button && <Button size="lg" className="mt-3 h-11 w-full rounded-xl" disabled={busy} onClick={() => void (action.onClick ? action.onClick() : act(action.endpoint!))}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />}{action.button}</Button>}{action.secondary && <Button variant="ghost" className="mt-2 h-9 w-full text-muted-foreground" disabled={busy} onClick={() => void act(action.secondary!.endpoint)}>{action.secondary.label}</Button>}{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</section>{showBorrowerHistory && <BorrowerHistory history={borrowerHistory} />}</div></Shell>;
}
