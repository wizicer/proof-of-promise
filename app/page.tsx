"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import HumanVerifyButton from "@/components/HumanVerifyButton";

export default function Home() {
  const router = useRouter();
  const [item, setItem] = useState("USB-C Charger");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function createDraft() {
    setError("");
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
      <input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} />
      <label>Optional note</label>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Meet me near the hackathon lounge." />

      {!createdId ? (
        <div className="actions"><button className="btn primary" onClick={createDraft} disabled={!item || !deadline}>Create Promise</button></div>
      ) : (
        <>
          <div className="success">Promise created. One last step: prove a real human stands behind it.</div>
          <HumanVerifyButton
            label="Prove I'm human & publish"
            action={`lend-${createdId}`}
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