import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Shell } from "@/layouts/Shell";
import { Empty } from "@/components/Empty";
import { PromiseCard } from "@/components/PromiseCard";
import { api } from "@/lib/api";
import type { HumanPromise } from "@/types";

export function ActivityPage() {
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
