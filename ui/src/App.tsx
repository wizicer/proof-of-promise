import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Activity as ActivityIcon, ArrowLeft, ArrowRight, BatteryCharging, BellRing, BookOpen, Cable, CalendarCheck2, Check, ChevronDown, Clock3, Copy, ExternalLink, Fingerprint, HandHeart, Headphones, Home, LoaderCircle, LogOut, MapPin, Moon, PackageCheck, PackageOpen, PlugZap, ScanLine, ShieldCheck, Sun, Umbrella, Unplug, UserRound, Wrench, type LucideIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WorldIdButton } from "@/components/world-id-button";
import { ShowUpMap, type ShowUpLocation } from "@/components/show-up-map";
import { useTheme } from "@/components/theme-provider";
import { api } from "@/lib/api";
import type { HumanPromise, PromiseStatus } from "@/types";

const statusCopy: Record<PromiseStatus, { label: string; hint: string }> = {
  REQUESTED: { label: "Looking for a lender", hint: "Share your promise link" },
  HANDOVER_PENDING: { label: "Handover in person", hint: "Borrower confirms receipt" },
  ACTIVE: { label: "Promise active", hint: "Item is with the borrower" },
  RETURN_REQUESTED: { label: "Return in progress", hint: "Lender checks the item" },
  FULFILLED: { label: "Promise kept", hint: "Returned and confirmed" },
  COMMITTED: { label: "Promise committed", hint: "Ready for you or your agent" },
};

const itemOptions: { label: string; icon: LucideIcon }[] = [
  { label: "Power bank", icon: BatteryCharging },
  { label: "Charger", icon: PlugZap },
  { label: "Charging cable", icon: Cable },
  { label: "Adapter", icon: Unplug },
  { label: "Umbrella", icon: Umbrella },
  { label: "Book", icon: BookOpen },
  { label: "Tools", icon: Wrench },
  { label: "Headphones", icon: Headphones },
];

const returnOptions = [
  { id: "2h", label: "2 hours", milliseconds: 2 * 60 * 60 * 1_000 },
  { id: "1d", label: "1 day", milliseconds: 24 * 60 * 60 * 1_000 },
  { id: "2d", label: "2 days", milliseconds: 2 * 24 * 60 * 60 * 1_000 },
  { id: "1w", label: "1 week", milliseconds: 7 * 24 * 60 * 60 * 1_000 },
] as const;

function relativeTime(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  const absolute = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });
  if (absolute < 90 * 60 * 1_000) return formatter.format(Math.round(difference / 60_000), "minute");
  if (absolute < 36 * 60 * 60 * 1_000) return formatter.format(Math.round(difference / 3_600_000), "hour");
  return formatter.format(Math.round(difference / 86_400_000), "day");
}

const registrationAction = "borrow-from-a-human-register";

function Login({ onVerified }: { onVerified: () => Promise<void> }) {
  const savedHandle = localStorage.getItem("bfa-login-handle") ?? "";
  const [mode, setMode] = useState<"login" | "register">(savedHandle ? "login" : "register");
  const [registrationStep, setRegistrationStep] = useState<"uniqueness" | "session">("uniqueness");
  const [loginHandle, setLoginHandle] = useState(savedHandle);
  const [existingSessionId, setExistingSessionId] = useState<`session_${string}` | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function locateAccount(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { setExistingSessionId((await api.loginContext(loginHandle.trim())).sessionId); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not find that account"); }
    finally { setBusy(false); }
  }

  function switchMode(next: "login" | "register") {
    setMode(next); setExistingSessionId(null); setRegistrationStep("uniqueness"); setError("");
  }

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
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-semibold"><button type="button" className={`rounded-lg px-3 py-2 ${mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`} onClick={() => switchMode("login")}>Sign in</button><button type="button" className={`rounded-lg px-3 py-2 ${mode === "register" ? "bg-background shadow-sm" : "text-muted-foreground"}`} onClick={() => switchMode("register")}>Create account</button></div>
          {mode === "register" ? registrationStep === "uniqueness"
            ? <WorldIdButton label="Verify unique human" action={registrationAction} onVerified={() => setRegistrationStep("session")} />
            : <><p className="mb-3 text-sm text-muted-foreground">One last step: create the reusable World Session for this account.</p><WorldIdButton label="Create account session" onVerified={async ({ loginHandle: handle }) => { if (!handle) { setError("Account recovery key was not returned"); return; } localStorage.setItem("bfa-login-handle", handle); setLoginHandle(handle); await onVerified(); }} /></>
            : existingSessionId
              ? <><p className="mb-3 text-sm text-muted-foreground">Account found. Prove the saved World Session to restore your Activity.</p><WorldIdButton label="Restore my account" existingSessionId={existingSessionId} onVerified={async () => { localStorage.setItem("bfa-login-handle", loginHandle.trim()); await onVerified(); }} /></>
              : <form className="grid gap-3" onSubmit={locateAccount}><Label htmlFor="login-handle">Account recovery key</Label><Input id="login-handle" autoComplete="off" spellCheck={false} required placeholder="Paste your recovery key" value={loginHandle} onChange={(event) => setLoginHandle(event.target.value)} /><Button size="lg" disabled={busy} className="h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90">{busy && <LoaderCircle className="animate-spin" />}Continue</Button></form>}
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Keep your recovery key on this device. It locates your private account without a name, email, or phone number.</p>
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
  return <Link to={`/p/${promise.id}`} className="promise-card group"><span className={`status-dot status-${promise.status.toLowerCase()}`}><span /></span><span className="promise-card-copy"><span className="promise-card-title"><strong>{promise.item}</strong><span className="role-tag">{promise.kind === "SHOW_UP" ? "Committed" : promise.myRole === "borrower" ? "Borrowing" : "Lending"}</span></span><span className="promise-card-meta"><span>{state.label}</span><span><Clock3 />{relativeTime(promise.deadline)}</span></span></span><ArrowRight className="promise-card-arrow" /></Link>;
}

function PromiseHome() {
  const navigate = useNavigate();
  const [promises, setPromises] = useState<HumanPromise[] | null>(null);
  const [open, setOpen] = useState(false);
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
    </section> :
      <form onSubmit={submit} className="form-card promise-form"><div className="flex items-center justify-between"><div><p className="eyebrow text-muted-foreground">Promise to Return</p><h2>What will you return?</h2></div><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Back</Button></div><fieldset><legend>Choose an item</legend><div className="choice-grid">{itemOptions.map(({ label, icon: Icon }) => <button key={label} type="button" className="choice-tile" aria-pressed={itemChoice === label} onClick={() => setItemChoice(label)}><Icon /><span>{label}</span></button>)}<button type="button" className="choice-tile" aria-pressed={itemChoice === "Custom"} onClick={() => setItemChoice("Custom")}><PackageOpen /><span>Custom</span></button></div></fieldset>{itemChoice === "Custom" && <div className="grid gap-2"><Label htmlFor="custom-item">Your item</Label><Input id="custom-item" autoFocus maxLength={80} required placeholder="What are you borrowing?" value={customItem} onChange={(event) => setCustomItem(event.target.value)} /></div>}<fieldset><legend>Return within</legend><div className="duration-grid">{returnOptions.map((option) => <button key={option.id} type="button" aria-pressed={returnChoice === option.id} onClick={() => setReturnChoice(option.id)}>{option.label}</button>)}<button type="button" aria-pressed={returnChoice === "custom"} onClick={() => setReturnChoice("custom")}>Custom</button></div></fieldset>{returnChoice === "custom" && <div className="grid gap-2"><Label htmlFor="deadline">Return date and time</Label><Input id="deadline" type="datetime-local" required value={customDeadline} onChange={(event) => setCustomDeadline(event.target.value)} /></div>}<details className="optional-note"><summary>Add a note <span>(optional)</span></summary><div className="mt-3"><div className="mb-2 text-right text-xs text-muted-foreground">{note.length}/240</div><Textarea id="note" aria-label="Optional note" maxLength={240} placeholder="Condition, meeting point, or anything useful…" value={note} onChange={(event) => setNote(event.target.value)} /></div></details>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button size="lg" disabled={busy || !itemChoice} className="h-14 rounded-2xl">{busy && <LoaderCircle className="animate-spin" />}Make this promise <ArrowRight /></Button></form>}
  </div></Shell>;
}

const showUpTimes = ["09:00", "12:00", "18:00", "21:00"];
const showUpWindows = [1, 2, 4];

function shiftClock(time: string, hours: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = ((hour * 60 + minute + Math.round(hours * 60)) % 1_440 + 1_440) % 1_440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function nextOccurrence(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function ShowUpPage() {
  const [location, setLocation] = useState<ShowUpLocation>({ lat: 35.6812, lng: 139.7671 });
  const [timeChoice, setTimeChoice] = useState("18:00");
  const [customTime, setCustomTime] = useState("");
  const [windowChoice, setWindowChoice] = useState("2");
  const [customWindow, setCustomWindow] = useState("2");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const time = timeChoice === "custom" ? customTime : timeChoice;
  const windowHours = windowChoice === "custom" ? Number(customWindow) : Number(windowChoice);
  const hasWindow = Number.isFinite(windowHours) && windowHours > 0;

  async function commitPromise() {
    if (!time || !hasWindow) { setError("Choose a valid time and flexibility window"); return; }
    setBusy(true); setError("");
    try {
      const created = await api.createShowUpPromise({
        latitude: location.lat,
        longitude: location.lng,
        scheduledAt: nextOccurrence(time),
        centerTime: time,
        windowHours,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        note,
      });
      navigate(`/p/${created.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not make this promise");
      setBusy(false);
    }
  }

  return <Shell><div className="show-up-page">
    <Link to="/" className="back-link"><ArrowLeft />Back</Link>
    <section className="show-up-heading">
      <p className="eyebrow">Promise to Show Up</p>
      <h1>Where will you be?</h1>
      <p>Choose an area, then set the time window when you expect to be there.</p>
    </section>

    <section className="show-up-card map-card">
      <div className="show-up-card-title"><div><h2>Choose the area</h2><p>Tap anywhere to move the 1 km area.</p></div><span className="map-radius-pill"><MapPin />1 km</span></div>
      <ShowUpMap value={location} onChange={setLocation} />
      <p className="map-coordinates" aria-live="polite">Center · {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
    </section>

    <section className="show-up-card">
      <fieldset>
        <legend>What time?</legend>
        <div className="show-up-options">{showUpTimes.map((option) => <button key={option} type="button" aria-pressed={timeChoice === option} onClick={() => setTimeChoice(option)}>{option}</button>)}<button type="button" aria-pressed={timeChoice === "custom"} onClick={() => setTimeChoice("custom")}>Custom</button></div>
      </fieldset>
      {timeChoice === "custom" && <div className="show-up-custom"><Label htmlFor="show-up-time">Choose a time</Label><Input id="show-up-time" type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} /></div>}
      <fieldset>
        <legend>How flexible?</legend>
        <div className="show-up-options window-options">{showUpWindows.map((hours) => <button key={hours} type="button" aria-pressed={windowChoice === String(hours)} onClick={() => setWindowChoice(String(hours))}>± {hours} {hours === 1 ? "hour" : "hours"}</button>)}<button type="button" aria-pressed={windowChoice === "custom"} onClick={() => setWindowChoice("custom")}>Custom</button></div>
      </fieldset>
      {windowChoice === "custom" && <div className="show-up-custom"><Label htmlFor="show-up-window">Hours before and after</Label><Input id="show-up-window" type="number" min="0.5" max="12" step="0.5" value={customWindow} onChange={(event) => setCustomWindow(event.target.value)} /></div>}
    </section>

    <section className="show-up-summary" aria-live="polite">
      <div className="show-up-summary-icon"><Clock3 /></div>
      <div><p>Your show-up window</p>{time && hasWindow ? <><strong>{shiftClock(time, -windowHours)}–{shiftClock(time, windowHours)}</strong><span>Around {time}, within ±{windowHours} {windowHours === 1 ? "hour" : "hours"}, inside the selected 1 km area.</span></> : <span>Choose a valid time and window to preview it.</span>}</div>
    </section>

    <details className="optional-note show-up-note"><summary>Add a note <span>(optional)</span></summary><div className="mt-3"><div className="mb-2 text-right text-xs text-muted-foreground">{note.length}/240</div><Textarea aria-label="Optional note" maxLength={240} placeholder="Meeting point, how to recognize you, or anything useful…" value={note} onChange={(event) => setNote(event.target.value)} /></div></details>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <Button size="lg" className="show-up-commit" disabled={busy || !time || !hasWindow} onClick={() => void commitPromise()}>{busy ? <LoaderCircle className="animate-spin" /> : <CalendarCheck2 />}Make this promise <ArrowRight /></Button>
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
  const active = promises?.filter((entry) => entry.kind !== "SHOW_UP" && entry.status !== "FULFILLED") ?? [];
  const committed = promises?.filter((entry) => entry.kind === "SHOW_UP") ?? [];
  const done = promises?.filter((entry) => entry.kind !== "SHOW_UP" && entry.status === "FULFILLED") ?? [];
  return <Shell><section className="compact-page-heading"><h1>Activity</h1><p>Every promise, right now.</p></section>{promises === null ? <div className="grid place-items-center py-12"><LoaderCircle className="animate-spin" /></div> : <><section className="activity-section"><div className="section-title"><h2>In motion</h2><span>{active.length}</span></div>{active.length ? <div className="card-grid">{active.map((entry) => <PromiseCard key={entry.id} promise={entry} />)}</div> : <Empty title="Nothing needs attention" copy="Your next active promise will appear here." />}</section>{committed.length > 0 && <section className="activity-section"><div className="section-title"><h2>Committed</h2><span>{committed.length}</span></div><div className="card-grid">{committed.map((entry) => <PromiseCard key={entry.id} promise={entry} />)}</div></section>}<section className="activity-section"><div className="section-title"><h2>Promises kept</h2><span>{done.length}</span></div>{done.length ? <div className="card-grid">{done.map((entry) => <PromiseCard key={entry.id} promise={entry} />)}</div> : <Empty title="Your history is unwritten" copy="Completed return promises will collect here." />}</section></>}</Shell>;
}

function PersonalPage({ onLogout }: { onLogout: () => Promise<void> }) {
  const [presence, setPresence] = useState(localStorage.getItem("bfa-presence") === "true");
  const loginHandle = localStorage.getItem("bfa-login-handle") ?? "";
  const { theme, setTheme } = useTheme();
  return <Shell><section className="compact-page-heading"><h1>Personal</h1><p>Your verified identity and preferences.</p></section><section className="profile-card"><div className="profile-avatar"><Fingerprint /></div><div><p className="text-lg font-bold">Verified human</p><p className="text-sm text-muted-foreground">World ID · Private account</p></div><ShieldCheck className="ml-auto text-success" /></section><section className="settings-card">{loginHandle && <div className="setting-row"><div className="min-w-0"><strong>Account recovery key</strong><p className="truncate font-mono">{loginHandle}</p></div><Button variant="outline" className="rounded-xl" onClick={() => void navigator.clipboard.writeText(loginHandle)}><Copy />Copy</Button></div>}<div className="setting-row"><div><strong>Fresh presence check</strong><p>Ask World ID to confirm you are present</p></div><Switch checked={presence} onCheckedChange={(value) => { setPresence(value); localStorage.setItem("bfa-presence", String(value)); }} /></div><div className="setting-row"><div><strong>Appearance</strong><p>Light, dark, or follow your device</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="rounded-xl">{theme === "dark" ? <Moon /> : <Sun />} {theme}<ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem><DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem><DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></section><Button variant="outline" size="lg" className="mt-5 h-14 w-full rounded-2xl text-destructive" onClick={() => void onLogout()}><LogOut />Sign out</Button><p className="mt-8 text-center text-xs leading-5 text-muted-foreground">Save your recovery key somewhere private. Your public promise never exposes it or your World ID details.</p></Shell>;
}

function ShowUpDetail({ promise }: { promise: HumanPromise & { showUp: NonNullable<HumanPromise["showUp"]> } }) {
  const [copied, setCopied] = useState<"link" | "agent" | null>(null);
  const details = promise.showUp;
  const shareUrl = `${location.origin}/p/${promise.id}`;
  const mcpUrl = `${location.origin}/mcp?promiseId=${encodeURIComponent(promise.id)}`;
  const windowLabel = `±${details.windowHours} ${details.windowHours === 1 ? "hour" : "hours"}`;
  const agentInstructions = `Use the Promise MCP server at ${mcpUrl} to verify promise ${promise.id}. Review its show-up area, ${details.centerTime} center time (${windowLabel}), timezone ${details.timezone}, and note. Then handle the follow-up work needed to help me keep this promise.`;

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
      {promise.note && <blockquote>“{promise.note}”</blockquote>}
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

function DetailPage() {
  const { id = "" } = useParams();
  const [promise, setPromise] = useState<HumanPromise | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
  async function act(action: string) { setBusy(true); setError(""); try { await api.act(id, action); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed"); } finally { setBusy(false); } }
  if (!promise) return <Shell><div className="grid min-h-[60vh] place-items-center">{error ? <Empty title="Promise unavailable" copy={error} /> : <LoaderCircle className="animate-spin" />}</div></Shell>;
  if (promise.kind === "SHOW_UP" && promise.showUp) return <ShowUpDetail promise={promise as HumanPromise & { showUp: NonNullable<HumanPromise["showUp"]> }} />;
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
  else if (isLender && promise.status === "ACTIVE") action = { title: "The item is out", copy: `The borrower promised to return it ${relativeTime(promise.deadline)}.` };
  else if (isBorrower && promise.status === "RETURN_REQUESTED") action = { title: "Waiting for their check", copy: "The lender needs to inspect and confirm the returned item.", secondary: { label: "Cancel return request", endpoint: "cancel-return" } };
  else if (isLender && promise.status === "RETURN_REQUESTED") action = { title: "Check what came back", copy: "Confirm only after the physical item is back with you.", button: "Item returned · Complete", endpoint: "confirm" };
  else action = { title: "Promise kept", copy: "Both humans completed the handover and return. Nicely done." };

  const displayedDeadline = relativeTime(promise.deadline);
  return <Shell><div className="detail-page"><Link to="/" className="back-link"><ArrowLeft />Back</Link><section className="detail-hero"><div className="flex items-center justify-between"><span className="role-tag">{promise.myRole ? `You’re ${promise.myRole === "borrower" ? "borrowing" : "lending"}` : "Lend request"}</span><span className="text-xs text-muted-foreground">#{promise.id.slice(0, 6)}</span></div><div className="detail-object"><div className="object-icon"><PackageCheck /></div><div><p className="eyebrow text-muted-foreground">The item</p><h1>{promise.item}</h1></div></div><div className="detail-facts"><div><Clock3 /><span><small>{isBorrower ? "Return" : "Expected back"}</small>{displayedDeadline}</span></div><div><ShieldCheck /><span><small>Status</small>{state.label}</span></div></div>{promise.note && <blockquote>“{promise.note}”</blockquote>}</section><section className="action-card" aria-live="polite"><div className="progress-track"><span className={`progress-${promise.status.toLowerCase()}`} /></div><p className="eyebrow text-muted-foreground">Right now · Live</p><h2>{action.title}</h2><p>{action.copy}</p>{isBorrower && promise.status === "REQUESTED" && <div className="qr-wrap"><QRCodeSVG value={shareUrl} size={104} bgColor="transparent" fgColor="currentColor" /><Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(shareUrl)}><Copy />Copy link</Button></div>}{action.button && <Button size="lg" className="mt-3 h-11 w-full rounded-xl" disabled={busy} onClick={() => void act(action.endpoint!)}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />}{action.button}</Button>}{action.secondary && <Button variant="ghost" className="mt-2 h-9 w-full text-muted-foreground" disabled={busy} onClick={() => void act(action.secondary!.endpoint)}>{action.secondary.label}</Button>}{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</section></div></Shell>;
}

export function App() {
  const [auth, setAuth] = useState<boolean | null>(null);
  async function refresh() {
    const session = await api.session();
    if (session.loginHandle) localStorage.setItem("bfa-login-handle", session.loginHandle);
    setAuth(session.authenticated);
  }
  async function signOut() { await api.logout(); setAuth(false); }
  useEffect(() => { refresh().catch(() => setAuth(false)); }, []);
  if (auth === null) return <div className="grid min-h-dvh place-items-center bg-primary"><LoaderCircle className="animate-spin text-primary-foreground" /></div>;
  if (!auth) return <Login onVerified={refresh} />;
  return <Routes><Route path="/" element={<PromiseHome />} /><Route path="/show-up" element={<ShowUpPage />} /><Route path="/activity" element={<ActivityPage />} /><Route path="/history" element={<Navigate to="/activity" replace />} /><Route path="/personal" element={<PersonalPage onLogout={signOut} />} /><Route path="/p/:id" element={<DetailPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
