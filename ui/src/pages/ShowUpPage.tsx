import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarCheck2, Clock3, LoaderCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shell } from "@/layouts/Shell";
import { ShowUpMap, type ShowUpLocation } from "@/components/show-up-map";
import { shiftClock, nextOccurrence } from "@/utils/time";
import { api } from "@/lib/api";

const showUpTimes = ["09:00", "12:00", "18:00", "21:00"];
const showUpWindows = [1, 2, 4];

export function ShowUpPage() {
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
