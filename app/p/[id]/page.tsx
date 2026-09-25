"use client";
import { use, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import HumanVerifyButton from "@/components/HumanVerifyButton";
import type { HumanPromise } from "@/lib/types";

export default function PromisePage({ params }: { params: Promise<{id:string}> }) {
  const { id } = use(params);
  const [p, setP] = useState<HumanPromise | null>(null);
  const [error, setError] = useState("");
  const [base, setBase] = useState("");

  async function refresh() {
    const r = await fetch(`/api/promises/${id}`, {cache:"no-store"});
    if (!r.ok) { setError("Promise not found"); return; }
    setP(await r.json());
  }
  useEffect(()=>{ setBase(process.env.NEXT_PUBLIC_BASE_URL || window.location.origin); refresh(); const t=setInterval(refresh,2500); return()=>clearInterval(t); },[id]);

  async function mutate(path:string) {
    const r = await fetch(`/api/promises/${id}/${path}`, {method:"POST"});
    if (!r.ok) { const d=await r.json(); setError(d.error||"Action failed"); return; }
    await refresh();
  }

  if (!p) return <main className="shell"><div className="card">{error || "Loading promise…"}</div></main>;

  return <main className="shell">
    <div className="eyebrow">Proof of Promise #{p.id.slice(0,8)}</div>
    <section className="card">
      <span className={`status ${p.status}`}>{p.status.replaceAll("_"," ")}</span>
      <div className="bigitem">🔌 {p.item}</div>
      <p className="muted">{p.note || "A human is willing to lend this to another human."}</p>
      <div className="meta">
        <div><span>Return before</span><strong>{new Date(p.deadline).toLocaleString()}</strong></div>
        <div><span>Lender</span><strong>{p.lender ? "Human verified ✓" : "Waiting"}</strong></div>
        <div><span>Borrower</span><strong>{p.borrower ? "Human verified ✓" : "Waiting"}</strong></div>
      </div>

      {p.status === "OPEN" && <>
        <div className="divider"/>
        <div className="grid">
          <div>
            <h3>Borrow this item</h3>
            <p className="muted">You promise to return it by the time above. No name or phone number is shared.</p>
            <HumanVerifyButton
              label="Prove I'm human & accept"
              action="promise-presence-test"
              signal={p.id}
              onVerified={async proof => {
                const r=await fetch(`/api/promises/${p.id}/accept`,{
                  method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({proof})
                });
                if(!r.ok) throw new Error("Could not accept");
                await refresh();
              }}
            />
          </div>
          <div className="center">
            <div className="qr"><QRCodeSVG value={`${base}/p/${p.id}`} size={190}/></div>
            <p className="tiny">Scan to borrow from this human</p>
          </div>
        </div>
      </>}

      {p.status === "ACTIVE" && <>
        <div className="success">Promise made. 🤝 Two verified humans are now behind this agreement.</div>
        <div className="actions"><button className="btn primary" onClick={()=>mutate("request-return")}>I'm returning it</button></div>
      </>}

      {p.status === "RETURN_REQUESTED" && <>
        <div className="success">Borrower says the item is being returned.</div>
        <p><strong>Lender:</strong> confirm only after the physical item is back in your hands.</p>
        <div className="actions"><button className="btn primary" onClick={()=>mutate("confirm")}>Confirm return</button></div>
      </>}

      {p.status === "FULFILLED" && <div className="proof center">
        <div className="eyebrow">Proof of Promise</div>
        <h2>Promise fulfilled. ✓</h2>
        <div className="check">Human A ✓ &nbsp; ↔ &nbsp; Human B ✓</div>
        <p><strong>{p.item}</strong> was returned.</p>
        <p className="muted">No names. No phone numbers. No passports.</p>
        <p className="tiny">Fulfilled {p.fulfilledAt ? new Date(p.fulfilledAt).toLocaleString() : ""}</p>
      </div>}
      {error && <div className="error">{error}</div>}
    </section>
  </main>;
}
