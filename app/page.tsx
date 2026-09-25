"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import HumanVerifyButton from "@/components/HumanVerifyButton";

type DeadlineChoice = "hour" | "day" | "custom";

export default function Home() {
  const router = useRouter();
  const [item, setItem] = useState("USB-C Charger");
  const [deadlineChoice, setDeadlineChoice] = useState<DeadlineChoice>("hour");
  const [customDeadline, setCustomDeadline] = useState("");
  const [note, setNote] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function createDraft() {
    setError("");
    const deadline = deadlineChoice === "custom"
      ? customDeadline
      : new Date(Date.now() + (deadlineChoice === "hour" ? 60 : 24 * 60) * 60 * 1000).toISOString();
    if (!deadline || new Date(deadline).getTime() <= Date.now()) {
      setError("Choose a future return time.");
      return;
    }
    const res = await fetch("/api/promises", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ item, deadline, note })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not create promise"); return; }
    setCreatedId(data.id);
  }

  return <main className="shell">
    <section className="hero">
      <div className="eyebrow">Proof of Promise</div>
      <h1>A promise you can make to a stranger.</h1>
      <p>Lend a real-world item without asking for a passport, phone number, deposit, or public profile.</p>
    </section>

    <section className="card">
      <span className="status">LENDER</span>
      <h2>Create a promise</h2>
      <label>What are you lending?</label>
      <input value={item} onChange={e=>setItem(e.target.value)} placeholder="USB-C Charger" />
      <label>Return before</label>
      <div className="time-options" role="group" aria-label="Return time">
        {([ ["hour", "In 1 hour"], ["day", "In 1 day"], ["custom", "Custom"] ] as const).map(([value, label]) =>
          <button key={value} type="button" className={`time-option ${deadlineChoice === value ? "selected" : ""}`}
            aria-pressed={deadlineChoice === value} onClick={() => setDeadlineChoice(value)}>{label}</button>
        )}
      </div>
      {deadlineChoice === "custom" && <input aria-label="Custom return time" type="datetime-local"
        value={customDeadline} onChange={e=>setCustomDeadline(e.target.value)} />}
      <label>Optional note</label>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Meet me near the hackathon lounge." />

      {!createdId ? (
        <div className="actions"><button className="btn primary" onClick={createDraft} disabled={!item || (deadlineChoice === "custom" && !customDeadline)}>Create Promise</button></div>
      ) : (
        <>
          <div className="success">Promise created. One last step: prove a real human stands behind it.</div>
          <HumanVerifyButton
            label="Prove I'm human & publish"
            action="promise-lender"
            signal={createdId}
            onVerified={async proof => {
              const res = await fetch(`/api/promises/${createdId}`, {
                method:"PATCH", headers:{"content-type":"application/json"},
                body:JSON.stringify({kind:"verify-lender", proof})
              });
              if (!res.ok) throw new Error("Could not publish promise");
              router.push(`/p/${createdId}`);
            }}
          />
        </>
      )}
      {error && <div className="error">{error}</div>}
    </section>
  </main>;
}
