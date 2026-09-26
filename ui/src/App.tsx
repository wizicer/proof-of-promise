import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Activity as ActivityIcon, ArrowLeft, ArrowRight, BellRing, Check, ChevronDown, Clock3, Copy, Fingerprint, HandHeart, Home, LoaderCircle, LogOut, Moon, PackageCheck, ScanLine, ShieldCheck, Sun, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WorldIdButton } from "@/components/world-id-button";
import { useTheme } from "@/components/theme-provider";
import { api } from "@/lib/api";
import type { HumanPromise, PromiseStatus } from "@/types";

const statusCopy: Record<PromiseStatus, { label: string; hint: string }> = {
  REQUESTED: { label: "Looking for a lender", hint: "Share your promise link" },
  HANDOVER_PENDING: { label: "Handover in person", hint: "Borrower confirms receipt" },
  ACTIVE: { label: "Promise active", hint: "Item is with the borrower" },
  RETURN_REQUESTED: { label: "Return in progress", hint: "Lender checks the item" },
  FULFILLED: { label: "Promise kept", hint: "Returned and confirmed" },
};

function time(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function Login({ onVerified }: { onVerified: () => Promise<void> }) {
  return (
    <main className="login-screen">
      <div className="login-orbit" aria-hidden="true"><span /><span /><span /></div>
      <section className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-8">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-tight"><span className="brand-mark"><HandHeart /></span> Promise</div>
        <div className="pb-8">
          <p className="eyebrow">Proof of promise</p>
          <h1 className="mt-4 text-[3.4rem] font-black leading-[.92] tracking-[-.07em]">Things move.<br /><span className="text-primary-foreground/55">Trust stays.</span></h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-primary-foreground/70">Make a clear promise with another verified person—and keep every step visible to both of you.</p>
        </div>
        <div className="rounded-[2rem] bg-background p-5 text-foreground shadow-2xl shadow-black/20">
          <div className="mb-5 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-primary"><ShieldCheck className="size-5" /></span><div><p className="font-bold">One human, one account</p><p className="text-sm text-muted-foreground">Private verification by World ID</p></div></div>
          <WorldIdButton label="Sign in with World ID" onVerified={onVerified} />
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">No names, emails, or phone numbers needed.</p>
        </div>
      </section>
    </main>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5"><Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight"><span className="brand-mark small"><HandHeart /></span><span>Promise</span></Link><span className="verified-pill"><Fingerprint /> Human verified</span></div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-28 pt-7">{children}</main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavLink to="/" end><Home /><span>Promise</span></NavLink>
        <NavLink to="/activity"><ActivityIcon /><span>Activity</span></NavLink>
        <NavLink to="/personal"><UserRound /><span>Personal</span></NavLink>
      </nav>
    </div>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><span><ScanLine /></span><h3>{title}</h3><p>{copy}</p></div>;
}

function PromiseCard({ promise }: { promise: HumanPromise }) {
  const state = statusCopy[promise.status];
  return <Link to={`/p/${promise.id}`} className="promise-card group"><div className="flex items-start justify-between gap-4"><span className={`status-dot status-${promise.status.toLowerCase()}`}><span /></span><span className="role-tag">{promise.myRole === "borrower" ? "Borrowing" : "Lending"}</span></div><h3>{promise.item}</h3><p>{state.label}</p><div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Clock3 className="size-4" />Due {time(promise.deadline)}</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></div></Link>;
}

function PromiseHome() {
  const navigate = useNavigate();
  const [promises, setPromises] = useState<HumanPromise[] | null>(null);
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api.promises().then(setPromises).catch((reason) => setError(reason.message)); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { const created = await api.createPromise({ item, deadline: new Date(deadline).toISOString(), note }); navigate(`/p/${created.id}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not make promise"); setBusy(false); }
  }

  const active = promises?.filter((entry) => entry.status !== "FULFILLED") ?? [];
  return <Shell><div className="promise-home">
    <img className="promise-home-wave promise-home-wave-top" src="/promise-assets/decorations/top-wave.svg" alt="" />
    <section className="promise-picker-heading">
      <img className="promise-heading-spark" src="/promise-assets/decorations/orange-spark.svg" alt="" />
      <img className="promise-heading-leaves" src="/promise-assets/decorations/header-leaves.svg" alt="" />
      <h1>Make Promise</h1>
    </section>
    {promises === null ? <div className="activity-notice promise-home-notice muted"><LoaderCircle className="animate-spin" /><span>Checking your promises…</span></div> : active.length > 0 && <Link to="/activity" className="activity-notice promise-home-notice"><span className="notice-icon"><BellRing /></span><span><strong>{active.length} {active.length === 1 ? "promise" : "promises"} in motion</strong></span><ArrowRight className="ml-auto" /></Link>}
    {!open ? <section className="promise-type-grid" aria-label="Promise types">
      <article className="promise-type-card promise-type-return">
        <div className="promise-type-art"><img src="/promise-assets/illustrations/borrow-return.png" alt="Two people passing a book" /></div>
        <h2>Promise to Return</h2>
        <button type="button" onClick={() => setOpen(true)}>Start <ArrowRight /></button>
      </article>
      <article className="promise-type-card promise-type-show-up">
        <div className="promise-type-art"><img src="/promise-assets/illustrations/reservation-calendar.png" alt="Calendar with a check mark" /></div>
        <span className="coming-soon">Coming soon</span>
        <h2>Promise to Show Up</h2>
        <button type="button" disabled>Coming soon</button>
      </article>
    </section> :
      <form onSubmit={submit} className="form-card promise-form"><div className="flex items-center justify-between"><div><p className="eyebrow text-muted-foreground">Promise to Return</p><h2>What will you return?</h2></div><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Back</Button></div><div className="grid gap-2"><Label htmlFor="item">Item</Label><Input id="item" autoFocus maxLength={80} required placeholder="e.g. a portable charger" value={item} onChange={(e) => setItem(e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="deadline">Promise to return it by</Label><Input id="deadline" type="datetime-local" required value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div><div className="grid gap-2"><div className="flex justify-between"><Label htmlFor="note">A note <span className="font-normal text-muted-foreground">(optional)</span></Label><span className="text-xs text-muted-foreground">{note.length}/240</span></div><Textarea id="note" maxLength={240} placeholder="Condition, meeting point, or anything useful…" value={note} onChange={(e) => setNote(e.target.value)} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button size="lg" disabled={busy} className="h-14 rounded-2xl">{busy && <LoaderCircle className="animate-spin" />}Make this promise <ArrowRight /></Button></form>}
    <img className="promise-home-wave promise-home-wave-bottom" src="/promise-assets/decorations/bottom-wave.svg" alt="" />
  </div></Shell>;
}

function ActivityPage() {
  const [promises, setPromises] = useState<HumanPromise[] | null>(null);
  useEffect(() => {
    let active = true;
    const sync = () => { if (document.visibilityState === "visible") void api.promises().then((value) => { if (active) setPromises(value); }).catch(() => { if (active) setPromises([]); }); };
    sync();
    const interval = window.setInterval(sync, 3_000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);
  const active = promises?.filter((entry) => entry.status !== "FULFILLED") ?? [];
  const done = promises?.filter((entry) => entry.status === "FULFILLED") ?? [];
  return <Shell><section className="page-heading"><p className="eyebrow text-muted-foreground">Activity tab</p><h1>Every promise,<br />right now.</h1><p>Follow what is moving today and the promises you have already kept.</p></section>{promises === null ? <div className="grid place-items-center py-16"><LoaderCircle className="animate-spin" /></div> : <><section className="mt-10"><div className="section-title"><h2>In motion</h2><span>{active.length}</span></div>{active.length ? <div className="card-grid">{active.map((entry) => <PromiseCard key={entry.id} promise={entry} />)}</div> : <Empty title="Nothing needs attention" copy="Your next active promise will appear here." />}</section><section className="mt-10"><div className="section-title"><h2>Promises kept</h2><span>{done.length}</span></div>{done.length ? <div className="card-grid">{done.map((entry) => <PromiseCard key={entry.id} promise={entry} />)}</div> : <Empty title="Your history is unwritten" copy="Completed promises will collect here—quiet proof that trust worked." />}</section></>}</Shell>;
}

function PersonalPage({ onLogout }: { onLogout: () => Promise<void> }) {
  const [presence, setPresence] = useState(localStorage.getItem("bfa-presence") === "true");
  const { theme, setTheme } = useTheme();
  return <Shell><section className="page-heading"><p className="eyebrow text-muted-foreground">Personal tab</p><h1>Your human<br />settings.</h1></section><section className="profile-card"><div className="profile-avatar"><Fingerprint /></div><div><p className="text-lg font-bold">Verified human</p><p className="text-sm text-muted-foreground">World ID · Private account</p></div><ShieldCheck className="ml-auto text-success" /></section><section className="settings-card"><div className="setting-row"><div><strong>Fresh presence check</strong><p>Ask World ID to confirm you are present</p></div><Switch checked={presence} onCheckedChange={(value) => { setPresence(value); localStorage.setItem("bfa-presence", String(value)); }} /></div><div className="setting-row"><div><strong>Appearance</strong><p>Light, dark, or follow your device</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="rounded-xl">{theme === "dark" ? <Moon /> : <Sun />} {theme}<ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem><DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem><DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></section><Button variant="outline" size="lg" className="mt-5 h-14 w-full rounded-2xl text-destructive" onClick={() => void onLogout()}><LogOut />Sign out</Button><p className="mt-8 text-center text-xs leading-5 text-muted-foreground">Your public promise never exposes your World ID nullifier or personal details.</p></Shell>;
}

function DetailPage() {
  const { id = "" } = useParams();
  const [promise, setPromise] = useState<HumanPromise | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() { try { setPromise(await api.promise(id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Promise unavailable"); } }
  useEffect(() => {
    let active = true;
    let inFlight = false;
    async function sync(showError: boolean) {
      if (inFlight) return;
      inFlight = true;
      try {
        const value = await api.promise(id);
        if (active) {
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
  async function act(action: string) { setBusy(true); setError(""); try { await api.act(id, action); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed"); } finally { setBusy(false); } }
  if (!promise) return <Shell><div className="grid min-h-[60vh] place-items-center">{error ? <Empty title="Promise unavailable" copy={error} /> : <LoaderCircle className="animate-spin" />}</div></Shell>;
  const shareUrl = `${location.origin}/p/${promise.id}`;
  const isBorrower = promise.myRole === "borrower";
  const isLender = promise.myRole === "lender";
  const state = statusCopy[promise.status];
  let action: { title: string; copy: string; button?: string; endpoint?: string; secondary?: { label: string; endpoint: string } };
  if (!isBorrower && !isLender) action = promise.status === "REQUESTED" ? { title: `Lend your ${promise.item}?`, copy: "Agree only when you are together and ready to hand it over.", button: "Agree to lend", endpoint: "lend" } : { title: "Already in motion", copy: "Another verified human is keeping this promise." };
  else if (isBorrower && promise.status === "REQUESTED") action = { title: "Find your lender", copy: "Let the lender scan this code. They will review the promise on their phone." };
  else if (isBorrower && promise.status === "HANDOVER_PENDING") action = { title: "Do you have it in hand?", copy: "Inspect the physical item first. This starts your active promise.", button: "I received the item", endpoint: "receive" };
  else if (isLender && promise.status === "HANDOVER_PENDING") action = { title: "Hand it over in person", copy: "The borrower confirms receipt on their device.", secondary: { label: "Cancel this handover", endpoint: "cancel-handover" } };
  else if (isBorrower && promise.status === "ACTIVE") action = { title: "Ready to give it back?", copy: "Hand the item back first, then ask the lender to confirm.", button: "I handed it back", endpoint: "request-return" };
  else if (isLender && promise.status === "ACTIVE") action = { title: "The item is out", copy: `The borrower promised to return it by ${time(promise.deadline)}.` };
  else if (isBorrower && promise.status === "RETURN_REQUESTED") action = { title: "Waiting for their check", copy: "The lender needs to inspect and confirm the returned item.", secondary: { label: "Cancel return request", endpoint: "cancel-return" } };
  else if (isLender && promise.status === "RETURN_REQUESTED") action = { title: "Check what came back", copy: "Confirm only after the physical item is back with you.", button: "Item returned · Complete", endpoint: "confirm" };
  else action = { title: "Promise kept", copy: "Both humans completed the handover and return. Nicely done." };

  return <Shell><Link to="/" className="back-link"><ArrowLeft />Back</Link><section className="detail-hero"><div className="flex items-center justify-between"><span className="role-tag">{promise.myRole ? `You’re ${promise.myRole === "borrower" ? "borrowing" : "lending"}` : "Lend request"}</span><span className="text-xs text-muted-foreground">#{promise.id.slice(0, 6)}</span></div><div className="detail-object"><div className="object-icon"><PackageCheck /></div><div><p className="eyebrow text-muted-foreground">The item</p><h1>{promise.item}</h1></div></div><div className="detail-facts"><div><Clock3 /><span><small>Return by</small>{time(promise.deadline)}</span></div><div><ShieldCheck /><span><small>Status</small>{state.label}</span></div></div>{promise.note && <blockquote>“{promise.note}”</blockquote>}</section><section className="action-card" aria-live="polite"><div className="progress-track"><span className={`progress-${promise.status.toLowerCase()}`} /></div><p className="eyebrow text-muted-foreground">Right now · Live</p><h2>{action.title}</h2><p>{action.copy}</p>{isBorrower && promise.status === "REQUESTED" && <div className="qr-wrap"><QRCodeSVG value={shareUrl} size={168} bgColor="transparent" fgColor="currentColor" /><Button variant="outline" onClick={() => void navigator.clipboard.writeText(shareUrl)}><Copy />Copy promise link</Button></div>}{action.button && <Button size="lg" className="mt-6 h-14 w-full rounded-2xl" disabled={busy} onClick={() => void act(action.endpoint!)}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />}{action.button}</Button>}{action.secondary && <Button variant="ghost" className="mt-3 w-full text-muted-foreground" disabled={busy} onClick={() => void act(action.secondary!.endpoint)}>{action.secondary.label}</Button>}{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}</section></Shell>;
}

export function App() {
  const [auth, setAuth] = useState<boolean | null>(null);
  async function refresh() { setAuth((await api.session()).authenticated); }
  async function signOut() { await api.logout(); setAuth(false); }
  useEffect(() => { refresh().catch(() => setAuth(false)); }, []);
  if (auth === null) return <div className="grid min-h-dvh place-items-center bg-primary"><LoaderCircle className="animate-spin text-primary-foreground" /></div>;
  if (!auth) return <Login onVerified={refresh} />;
  return <Routes><Route path="/" element={<PromiseHome />} /><Route path="/activity" element={<ActivityPage />} /><Route path="/history" element={<Navigate to="/activity" replace />} /><Route path="/personal" element={<PersonalPage onLogout={signOut} />} /><Route path="/p/:id" element={<DetailPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
