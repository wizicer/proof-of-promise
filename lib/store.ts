import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { HumanPromise, PromiseStatus } from "./types";

const path = process.env.PROMISE_DB_PATH || join(process.cwd(), ".data", "promises.sqlite");
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, world_nullifier TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, person_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS challenges (nonce TEXT PRIMARY KEY, action TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS promises (id TEXT PRIMARY KEY, item TEXT NOT NULL, deadline TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL, borrower_id TEXT NOT NULL, lender_id TEXT, fulfilled_at TEXT);`);

type Row = { id:string; item:string; deadline:string; note:string; created_at:string; status:PromiseStatus; borrower_id:string; lender_id:string|null; fulfilled_at:string|null };
const hash = (s:string) => createHash("sha256").update(s).digest("hex");
export function createChallenge(nonce:string, action:string, expiresAt:number) {
  db.prepare("INSERT INTO challenges (nonce,action,expires_at) VALUES (?,?,?)").run(nonce,action,expiresAt);
}
export function consumeChallenge(nonce:string, action:string) {
  return db.prepare("UPDATE challenges SET used=1 WHERE nonce=? AND action=? AND used=0 AND expires_at>?").run(nonce,action,Math.floor(Date.now()/1000)).changes===1;
}
export function login(nullifier:string) {
  const person = db.prepare("SELECT id FROM people WHERE world_nullifier=?").get(nullifier) as {id:string}|undefined;
  const id = person?.id || crypto.randomUUID();
  if (!person) db.prepare("INSERT INTO people VALUES (?,?,?)").run(id,nullifier,new Date().toISOString());
  const token=randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(hash(token),id,Date.now()+30*86400_000);
  return {id,token};
}
export async function setSessionCookie(token:string) {
  (await cookies()).set("bfa_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:30*86400});
}
export async function currentPerson() {
  const token=(await cookies()).get("bfa_session")?.value;
  if (!token) return null;
  const row=db.prepare("SELECT person_id FROM sessions WHERE token_hash=? AND expires_at>?").get(hash(token),Date.now()) as {person_id:string}|undefined;
  return row?.person_id || null;
}
export async function logout() {
  const jar=await cookies(); const token=jar.get("bfa_session")?.value;
  if(token) db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(token));
  jar.delete("bfa_session");
}
function view(row:Row, personId?:string|null):HumanPromise {
  return {id:row.id,item:row.item,deadline:row.deadline,note:row.note,createdAt:row.created_at,status:row.status,borrowerVerified:true,lenderVerified:!!row.lender_id,fulfilledAt:row.fulfilled_at||undefined,myRole:personId===row.borrower_id?"borrower":personId===row.lender_id?"lender":undefined};
}
export function getPromise(id:string,personId?:string|null) {
  const row=db.prepare("SELECT * FROM promises WHERE id=?").get(id) as Row|undefined;
  return row?view(row,personId):null;
}
export function listPromises(personId:string) {
  const rows=db.prepare("SELECT * FROM promises WHERE borrower_id=? OR lender_id=? ORDER BY created_at DESC").all(personId,personId) as Row[];
  return rows.map(row=>view(row,personId));
}
export function createPromise(personId:string,item:string,deadline:string,note:string) {
  const id=crypto.randomUUID(), createdAt=new Date().toISOString();
  db.prepare("INSERT INTO promises VALUES (?,?,?,?,?,?,?,?,?)").run(id,item,deadline,note,createdAt,"REQUESTED",personId,null,null);
  return getPromise(id,personId)!;
}
export function transition(id:string,from:PromiseStatus,to:PromiseStatus,personId:string,role:"borrower"|"lender") {
  const actor=role==="borrower"?"borrower_id":"lender_id";
  const result=db.prepare(`UPDATE promises SET status=?, fulfilled_at=CASE WHEN ?='FULFILLED' THEN ? ELSE fulfilled_at END WHERE id=? AND status=? AND ${actor}=?`).run(to,to,new Date().toISOString(),id,from,personId);
  return result.changes===1;
}
export function joinPromise(id:string,personId:string) {
  return db.prepare("UPDATE promises SET lender_id=?, status='HANDOVER_PENDING' WHERE id=? AND status='REQUESTED' AND borrower_id<>? AND lender_id IS NULL").run(personId,id,personId).changes===1;
}
export function cancelHandover(id:string,personId:string) {
  return db.prepare("UPDATE promises SET lender_id=NULL,status='REQUESTED' WHERE id=? AND status='HANDOVER_PENDING' AND lender_id=?").run(id,personId).changes===1;
}
