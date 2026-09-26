"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import HumanVerifyButton from "@/components/HumanVerifyButton";
import type { HumanPromise } from "@/lib/types";

export default function PromisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [p, setP] = useState<HumanPromise | null>(null);
  const [auth, setAuth] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [base, setBase] = useState("");

  async function refresh() {
    const [a, r] = await Promise.all([
      fetch("/api/session", { cache: "no-store" }),
      fetch(`/api/promises/${id}`, { cache: "no-store" })
    ]);
    setAuth((await a.json()).authenticated);
    if (r.ok) setP(await r.json());
    else setError("Request not found");
  }

  useEffect(() => {
    setBase(window.location.origin);
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [id]);

  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/promises/${id}/${action}`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || "Action failed");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!p) return <main className="shell"><div className="card">{error || "Loading…"}</div></main>;

  const isBorrower = p.myRole === "borrower";
  const isLender = p.myRole === "lender";

  // Banner text tailored to current viewer's perspective
  const bannerMessage = () => {
    if (p.status === "REQUESTED") {
      if (isBorrower) return "Show this QR to a friend or lender nearby. Once they scan and agree, the handover begins.";
      if (auth) return "Review the borrowing details below. If you have the item, tap 'Agree to lend'.";
      return "Someone wants to borrow this item. Verify with World ID to become the lender.";
    }
    if (p.status === "HANDOVER_PENDING") {
      if (isBorrower) return "The lender agreed to hand over the item. Confirm receipt once you hold it in hand.";
      if (isLender) return "Please physically hand the item to the borrower. Waiting for borrower to confirm receipt on their device.";
      return "Handover is currently pending between borrower and lender.";
    }
    if (p.status === "ACTIVE") {
      if (isBorrower) return "Item is currently with you. Return it in person before requesting return confirmation.";
      if (isLender) return "Your item is currently borrowed. Awaiting return by agreed deadline.";
      return "This item is currently in use.";
    }
    if (p.status === "RETURN_REQUESTED") {
      if (isBorrower) return "You have requested return. Please wait for the lender to inspect the item and confirm.";
      if (isLender) return "The borrower has returned the item. Please inspect it physically, then confirm receipt.";
      return "Item return has been requested and is awaiting confirmation.";
    }
    return "This promise has been successfully fulfilled by both humans ✓";
  };

  return (
    <main className="shell">
      <Link href="/" className="back-link">← My promises</Link>
      
      <section className="workspace">
        <div className="workspace-head">
          <div className="section-kicker">
            {isBorrower ? "MY REQUEST · BORROWER" : isLender ? "MY LOAN · LENDER" : "BORROWING REQUEST"}
          </div>
          <h2>{p.item}</h2>
          <p>{p.note || "A real-world borrowing promise between two verified humans."}</p>
          <span className={`status ${p.status}`}>{p.status.replaceAll("_", " ")}</span>
        </div>

        <div className="form-area">
          <div className="summary">
            <div><span>Return deadline</span><strong>{new Date(p.deadline).toLocaleString()}</strong></div>
            <div><span>Borrower</span><strong>World ID verified ✓</strong></div>
            <div><span>Lender</span><strong>{p.lenderVerified ? "World ID verified ✓" : "Waiting for lender"}</strong></div>
          </div>
        </div>

        <div className="stage">
          <div className="stage-banner">{bannerMessage()}</div>

          {/* Borrower View */}
          {isBorrower && (
            <article className="person-card active">
              <div className="person-head">
                <div className="avatar borrower">◉</div>
                <div>
                  <strong>Borrower View</strong>
                  <small>Promise maker · You</small>
                </div>
              </div>
              <div className="person-body">
                <div className="micro">YOUR ACTIONS</div>
                {p.status === "REQUESTED" ? (
                  <>
                    <h3>Show this QR code to lender</h3>
                    <p>Have the lender open your camera or QR scanner to review your request.</p>
                    <div className="qr-box">
                      {base && <QRCodeSVG value={`${base}/p/${p.id}`} size={160} />}
                    </div>
                    <p className="tiny">{base}/p/{p.id}</p>
                  </>
                ) : p.status === "HANDOVER_PENDING" ? (
                  <>
                    <h3>Confirm physical receipt</h3>
                    <p>Inspect the item in person. Confirm only after you have physically received it.</p>
                    <button className="btn primary" disabled={busy} onClick={() => act("receive")}>
                      I received the item →
                    </button>
                  </>
                ) : p.status === "ACTIVE" ? (
                  <>
                    <h3>Item currently in use</h3>
                    <p>When you are ready to return, hand the item back to the lender in person.</p>
                    <button className="btn primary" disabled={busy} onClick={() => act("request-return")}>
                      Item handed back · Request return →
                    </button>
                  </>
                ) : p.status === "RETURN_REQUESTED" ? (
                  <>
                    <h3>Waiting for lender confirmation</h3>
                    <p>The lender needs to inspect the returned item on their device.</p>
                    <button className="btn secondary" disabled={busy} onClick={() => act("cancel-return")}>
                      Cancel return request
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Promise fulfilled ✓</h3>
                    <p>The lender confirmed receiving the returned item. Thank you!</p>
                  </>
                )}
              </div>
            </article>
          )}

          {/* Lender View */}
          {isLender && (
            <article className="person-card active">
              <div className="person-head">
                <div className="avatar lender">▣</div>
                <div>
                  <strong>Lender View</strong>
                  <small>Promise holder · You</small>
                </div>
              </div>
              <div className="person-body">
                <div className="micro">YOUR ACTIONS</div>
                {p.status === "HANDOVER_PENDING" ? (
                  <>
                    <h3>Waiting for borrower to confirm</h3>
                    <p>Hand over the item now. Ask the borrower to tap confirm on their screen.</p>
                    <button className="btn secondary" disabled={busy} onClick={() => act("cancel-handover")}>
                      Borrower did not take item · Cancel
                    </button>
                  </>
                ) : p.status === "ACTIVE" ? (
                  <>
                    <h3>Item is with borrower</h3>
                    <p>Borrower is committed to returning the item before {new Date(p.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</p>
                  </>
                ) : p.status === "RETURN_REQUESTED" ? (
                  <>
                    <h3>Inspect and confirm returned item</h3>
                    <p>Inspect the physical item before concluding the promise.</p>
                    <button className="btn primary" disabled={busy} onClick={() => act("confirm")}>
                      Item received · Complete promise →
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Proof of Promise fulfilled ✓</h3>
                    <p>Returned and verified {p.fulfilledAt ? new Date(p.fulfilledAt).toLocaleString() : ""}.</p>
                  </>
                )}
              </div>
            </article>
          )}

          {/* Third-party / Potential Lender View (Not borrower, not current lender) */}
          {!isBorrower && !isLender && (
            <article className="person-card active">
              <div className="person-head">
                <div className="avatar lender">▣</div>
                <div>
                  <strong>Lender Action</strong>
                  <small>Lending request</small>
                </div>
              </div>
              <div className="person-body">
                <div className="micro">RESPOND TO PROMISE</div>
                {p.status === "REQUESTED" ? (
                  <>
                    <h3>Lend this {p.item}?</h3>
                    <p>Review the return deadline and item info above. Verify your World ID to accept this lending promise.</p>
                    {!auth ? (
                      <HumanVerifyButton label="Verify World ID to lend" onVerified={refresh} />
                    ) : (
                      <button className="btn primary" disabled={busy} onClick={() => act("lend")}>
                        Agree to lend & hand over →
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <h3>Promise in progress</h3>
                    <p>This borrowing promise is already being fulfilled by another verified human.</p>
                  </>
                )}
              </div>
            </article>
          )}
        </div>

        {error && <div className="error">{error}</div>}
      </section>
    </main>
  );
}
