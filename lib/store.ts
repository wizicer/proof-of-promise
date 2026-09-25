import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cookies } from "next/headers";
import type { HumanPromise, PromiseStatus } from "./types";

const path = process.env.PROMISE_DATA_PATH || join(process.cwd(), ".data", "store.json");
const lockPath = `${path}.lock`;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

type Person = { id: string; worldNullifier: string; createdAt: string };
type Session = { tokenHash: string; personId: string; expiresAt: number };
type Challenge = { nonce: string; action: string; expiresAt: number; used: boolean };
type Record = { id: string; item: string; deadline: string; note: string; createdAt: string; status: PromiseStatus; borrowerId: string; lenderId?: string; fulfilledAt?: string };
type Data = { version: 1; people: Person[]; sessions: Session[]; challenges: Challenge[]; promises: Record[] };
const empty = (): Data => ({ version: 1, people: [], sessions: [], challenges: [], promises: [] });

async function read(): Promise<Data> {
  try {
    const data: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!data || typeof data !== "object" || (data as Data).version !== 1 || !Array.isArray((data as Data).promises) || !Array.isArray((data as Data).people) || !Array.isArray((data as Data).sessions) || !Array.isArray((data as Data).challenges)) throw new Error("Invalid promise data file");
    return data as Data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
}

// A lock and atomic rename keep state transitions consistent across server processes.
async function change<T>(update: (data: Data) => T): Promise<T> {
  await mkdir(dirname(path), { recursive: true });
  const started = Date.now();
  let lock: Awaited<ReturnType<typeof open>> | undefined;
  while (!lock) {
    try { lock = await open(lockPath, "wx", 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const age = await stat(lockPath).then(s => Date.now() - s.mtimeMs).catch(() => 0);
      if (age > 30_000) await unlink(lockPath).catch(() => {});
      if (Date.now() - started > 5_000) throw new Error("Promise data is busy");
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    const data = await read();
    const result = update(data);
    const file = await open(temp, "wx", 0o600);
    try { await file.writeFile(JSON.stringify(data, null, 2)); await file.sync(); }
    finally { await file.close(); }
    await rename(temp, path);
    return result;
  } finally {
    await unlink(temp).catch(() => {});
    await lock.close();
    await unlink(lockPath).catch(() => {});
  }
}

export async function createChallenge(nonce: string, action: string, expiresAt: number) {
  await change(data => { data.challenges = data.challenges.filter(c => c.expiresAt > Math.floor(Date.now() / 1000)); data.challenges.push({ nonce, action, expiresAt, used: false }); });
}
export async function consumeChallenge(nonce: string, action: string) {
  return change(data => {
    const challenge = data.challenges.find(c => c.nonce === nonce && c.action === action && !c.used && c.expiresAt > Math.floor(Date.now() / 1000));
    if (!challenge) return false;
    challenge.used = true;
    return true;
  });
}
export async function login(nullifier: string) {
  return change(data => {
    let person = data.people.find(p => p.worldNullifier === nullifier);
    if (!person) { person = { id: randomUUID(), worldNullifier: nullifier, createdAt: new Date().toISOString() }; data.people.push(person); }
    const token = randomBytes(32).toString("base64url");
    data.sessions = data.sessions.filter(s => s.expiresAt > Date.now());
    data.sessions.push({ tokenHash: hash(token), personId: person.id, expiresAt: Date.now() + 30 * 86400_000 });
    return { id: person.id, token };
  });
}
export async function setSessionCookie(token: string) {
  (await cookies()).set("bfa_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
}
export async function currentPerson() {
  const token = (await cookies()).get("bfa_session")?.value;
  if (!token) return null;
  const session = (await read()).sessions.find(s => s.tokenHash === hash(token) && s.expiresAt > Date.now());
  return session?.personId || null;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("bfa_session")?.value;
  if (token) await change(data => { data.sessions = data.sessions.filter(s => s.tokenHash !== hash(token)); });
  jar.delete("bfa_session");
}
function view(row: Record, personId?: string | null): HumanPromise {
  return { id: row.id, item: row.item, deadline: row.deadline, note: row.note, createdAt: row.createdAt, status: row.status, borrowerVerified: true, lenderVerified: !!row.lenderId, fulfilledAt: row.fulfilledAt, myRole: personId === row.borrowerId ? "borrower" : personId === row.lenderId ? "lender" : undefined };
}
export async function getPromise(id: string, personId?: string | null) {
  const row = (await read()).promises.find(p => p.id === id);
  return row ? view(row, personId) : null;
}
export async function listPromises(personId: string) {
  return (await read()).promises.filter(p => p.borrowerId === personId || p.lenderId === personId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(p => view(p, personId));
}
export async function createPromise(personId: string, item: string, deadline: string, note: string) {
  return change(data => {
    const row: Record = { id: randomUUID(), item, deadline, note, createdAt: new Date().toISOString(), status: "REQUESTED", borrowerId: personId };
    data.promises.push(row);
    return view(row, personId);
  });
}
export async function transition(id: string, from: PromiseStatus, to: PromiseStatus, personId: string, role: "borrower" | "lender") {
  return change(data => {
    const row = data.promises.find(p => p.id === id && p.status === from && (role === "borrower" ? p.borrowerId : p.lenderId) === personId);
    if (!row) return false;
    row.status = to;
    if (to === "FULFILLED") row.fulfilledAt = new Date().toISOString();
    return true;
  });
}
export async function joinPromise(id: string, personId: string) {
  return change(data => {
    const row = data.promises.find(p => p.id === id && p.status === "REQUESTED" && p.borrowerId !== personId && !p.lenderId);
    if (!row) return false;
    row.lenderId = personId;
    row.status = "HANDOVER_PENDING";
    return true;
  });
}
export async function cancelHandover(id: string, personId: string) {
  return change(data => {
    const row = data.promises.find(p => p.id === id && p.status === "HANDOVER_PENDING" && p.lenderId === personId);
    if (!row) return false;
    delete row.lenderId;
    row.status = "REQUESTED";
    return true;
  });
}
