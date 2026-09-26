import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BellRing, LoaderCircle, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shell } from "@/layouts/Shell";
import { ScanModal } from "@/components/ScanModal";
import { itemOptions } from "@/constants/items";
import { returnOptions } from "@/constants/durations";
import { api } from "@/lib/api";
import type { HumanPromise } from "@/types";

export function HomePage() {
  const navigate = useNavigate();
  const [promises, setPromises] = useState<HumanPromise[] | null>(null);
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [itemChoice, setItemChoice] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [returnChoice, setReturnChoice] = useState("2h");
  const [customDeadline, setCustomDeadline] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api.promises().then(setPromises).catch((reason) => setError(reason.message)); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const item = itemChoice === "Custom" ? customItem.trim() : itemChoice;
    const preset = returnOptions.find((option) => option.id === returnChoice);
    if (!item) { setError("Choose an item or enter your own"); setBusy(false); return; }
    if (!preset && !customDeadline) { setError("Choose when you will return it"); setBusy(false); return; }
    const deadline = preset ? new Date(Date.now() + preset.milliseconds) : new Date(customDeadline);
    try { const created = await api.createPromise({ item, deadline: deadline.toISOString(), note }); navigate(`/p/${created.id}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not make promise"); setBusy(false); }
  }

  const active = promises?.filter((entry) => entry.kind !== "SHOW_UP" && entry.status !== "FULFILLED") ?? [];
  return <Shell><div className="promise-home">
    <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
    <section className="promise-picker-heading">
      <h1>Make a Promise</h1>
      <p>Choose what kind of promise you want to make.</p>
    </section>
    {promises === null ? <div className="activity-notice promise-home-notice muted"><LoaderCircle className="animate-spin" /><span>Checking your promises…</span></div> : active.length > 0 && <Link to="/activity" className="activity-notice promise-home-notice"><span className="notice-icon"><BellRing /></span><span><strong>{active.length} {active.length === 1 ? "promise" : "promises"} in motion</strong></span><ArrowRight className="ml-auto" /></Link>}
    {!open ? <section className="promise-type-grid" aria-label="Promise types">
      <article className="promise-type-card promise-type-return">
        <div className="promise-type-art"><img src="/promise-assets/illustrations/borrow-return.png" alt="Two people passing a book" /></div>
        <h2>Promise to Return</h2>
        <p>Borrow an item and promise to return it on time.</p>
        <button type="button" onClick={() => setOpen(true)}>Start <ArrowRight /></button>
      </article>
      <article className="promise-type-card promise-type-show-up">
        <div className="promise-type-art"><img src="/promise-assets/illustrations/reservation-calendar.png" alt="Calendar with a check mark" /></div>
        <h2>Promise to Show Up</h2>
        <p>Book a place or time and promise to be there.</p>
        <button type="button" onClick={() => navigate("/show-up")}>Start <ArrowRight /></button>
      </article>
      <article className="promise-type-card promise-type-scan">
        <div className="promise-type-art"><img src="/promise-assets/illustrations/scan-promise.png" alt="Person scanning merchant QR code" /></div>
        <h2>Scan to Promise</h2>
        <p>Scan a merchant QR code to borrow items instantly.</p>
        <button type="button" onClick={() => setScanOpen(true)}>Scan QR <ArrowRight /></button>
      </article>
    </section> :
      <form onSubmit={submit} className="form-card promise-form"><div className="flex items-center justify-between"><div><p className="eyebrow text-muted-foreground">Promise to Return</p><h2>What will you return?</h2></div><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Back</Button></div><fieldset><legend>Choose an item</legend><div className="choice-grid">{itemOptions.map(({ label, icon: Icon }) => <button key={label} type="button" className="choice-tile" aria-pressed={itemChoice === label} onClick={() => setItemChoice(label)}><Icon /><span>{label}</span></button>)}<button type="button" className="choice-tile" aria-pressed={itemChoice === "Custom"} onClick={() => setItemChoice("Custom")}><PackageOpen /><span>Custom</span></button></div></fieldset>{itemChoice === "Custom" && <div className="grid gap-2"><Label htmlFor="custom-item">Your item</Label><Input id="custom-item" autoFocus maxLength={80} required placeholder="What are you borrowing?" value={customItem} onChange={(event) => setCustomItem(event.target.value)} /></div>}<fieldset><legend>Return within</legend><div className="duration-grid">{returnOptions.map((option) => <button key={option.id} type="button" aria-pressed={returnChoice === option.id} onClick={() => setReturnChoice(option.id)}>{option.label}</button>)}<button type="button" aria-pressed={returnChoice === "custom"} onClick={() => setReturnChoice("custom")}>Custom</button></div></fieldset>{returnChoice === "custom" && <div className="grid gap-2"><Label htmlFor="deadline">Return date and time</Label><Input id="deadline" type="datetime-local" required value={customDeadline} onChange={(event) => setCustomDeadline(event.target.value)} /></div>}<details className="optional-note"><summary>Add a note <span>(optional)</span></summary><div className="mt-3"><div className="mb-2 text-right text-xs text-muted-foreground">{note.length}/240</div><Textarea id="note" aria-label="Optional note" maxLength={240} placeholder="Condition, meeting point, or anything useful…" value={note} onChange={(event) => setNote(event.target.value)} /></div></details>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button size="lg" disabled={busy || !itemChoice} className="h-14 rounded-2xl">{busy && <LoaderCircle className="animate-spin" />}Make this promise <ArrowRight /></Button></form>}
  </div></Shell>;
}
