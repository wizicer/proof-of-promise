"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import HumanVerifyButton from "@/components/HumanVerifyButton";
import type {HumanPromise} from "@/lib/types";

type Due="hour"|"day"|"custom";
const statusLabel:Record<HumanPromise["status"],string>={REQUESTED:"Waiting for lender",HANDOVER_PENDING:"Confirm receipt",ACTIVE:"Borrowing",RETURN_REQUESTED:"Return awaiting confirmation",FULFILLED:"Fulfilled"};
export default function Home(){
  const router=useRouter();const [auth,setAuth]=useState<boolean|null>(null),[history,setHistory]=useState<HumanPromise[]>([]),[error,setError]=useState(""),[saving,setSaving]=useState(false);
  const [item,setItem]=useState(""),[note,setNote]=useState(""),[due,setDue]=useState<Due>("hour"),[custom,setCustom]=useState("");
  async function refresh(){const s=await fetch("/api/session",{cache:"no-store"}).then(r=>r.json());setAuth(s.authenticated);if(s.authenticated){const r=await fetch("/api/promises",{cache:"no-store"});if(r.ok)setHistory(await r.json());}}
  useEffect(()=>{refresh()},[]);
  async function create(){setError("");setSaving(true);try{const deadline=due==="custom"?new Date(custom).toISOString():new Date(Date.now()+(due==="hour"?1:24)*3600_000).toISOString();const r=await fetch("/api/promises",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item,deadline,note})});const data=await r.json();if(!r.ok)throw new Error(data.error);router.push(`/p/${data.id}`)}catch(e){setError(e instanceof Error?e.message:"Could not create request")}finally{setSaving(false)}}
  return <main className="shell home-shell">
    <section className="hero"><div className="eyebrow">PROOF OF PROMISE · C2C</div><h1>Borrow from a <em>human.</em></h1><p>A simple promise for lending real things between two verified people.</p></section>
    {!auth?<section className="workspace"><div className="workspace-head"><div className="section-kicker">START HERE</div><h2>Verify your World ID</h2><p>One verified account connects your borrowing and lending history.</p><HumanVerifyButton label="Continue with World ID" onVerified={refresh}/></div></section>:<>
      <section className="workspace"><div className="workspace-head"><div className="section-kicker">PROMISE MAKER · BORROWER</div><h2>What do you want to borrow?</h2><p>Create a request, then show its QR code to someone who can lend it.</p></div><div className="form-area"><label htmlFor="item">Item name</label><input id="item" maxLength={80} value={item} onChange={e=>setItem(e.target.value)} placeholder="e.g. Power bank, umbrella, camera"/><label>Expected return time</label><div className="time-options">{([['hour','In 1 hour'],['day','In 1 day'],['custom','Custom']] as const).map(([key,title])=><button key={key} type="button" className={`time-option ${due===key?"selected":""}`} onClick={()=>setDue(key)}>{title}</button>)}</div>{due==="custom"&&<input type="datetime-local" aria-label="Custom return time" value={custom} onChange={e=>setCustom(e.target.value)}/>}<label htmlFor="note">Memo · optional</label><textarea id="note" maxLength={240} value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Will return after the event"/><div className="actions"><button className="btn primary" disabled={saving||!item.trim()||(due==="custom"&&!custom)} onClick={create}>Create request →</button></div>{error&&<p className="error">{error}</p>}</div></section>
      <section className="workspace history"><div className="workspace-head"><div className="section-kicker">MY PROMISES</div><h2>History</h2><p>Requests linked to this verified account, whether you borrowed or lent.</p></div><div className="history-list">{history.length===0?<p className="muted">No promises yet.</p>:history.map(p=><Link className="history-row" href={`/p/${p.id}`} key={p.id}><span><strong>{p.item}</strong><small>{p.myRole==="borrower"?"Borrower · Promise maker":"Lender · Promise holder"} · {new Date(p.createdAt).toLocaleString()}</small></span><span className={`status ${p.status}`}>{statusLabel[p.status]}</span></Link>)}</div></section>
      <div className="actions"><button className="text-button" onClick={async()=>{await fetch("/api/session",{method:"DELETE"});setAuth(false);setHistory([])}}>Sign out</button></div>
    </>}
  </main>;
}
