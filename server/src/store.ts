import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { BorrowerHistory, HumanPromise, PromiseKind, PromiseRole, PromiseStatus, ShowUpDetails } from "./types.js";

type Person = { id: string; sessionId?: string; worldNullifier?: string; oidcSub?: string; createdAt: string };
type Session = { tokenHash: string; personId: string; expiresAt: number };
type Challenge = { nonce: string; action: string; expiresAt: number; used: boolean };
type PromiseRecord = { id: string; item: string; deadline: string; note: string; createdAt: string; status: PromiseStatus; borrowerId: string; lenderId?: string; fulfilledAt?: string; kind?: PromiseKind; showUp?: ShowUpDetails; durationLabel?: string; icon?: string };
type Data = { version: 1; people: Person[]; sessions: Session[]; challenges: Challenge[]; promises: PromiseRecord[] };


const dataPath = resolve(process.env.PROMISE_DATA_PATH ?? ".data/store.json");
const lockPath = `${dataPath}.lock`;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const empty = (): Data => ({ version: 1, people: [], sessions: [], challenges: [], promises: [] });

async function read(): Promise<Data> {
  try {
    const value: unknown = JSON.parse(await readFile(dataPath, "utf8"));
    if (!value || typeof value !== "object") throw new Error("Invalid promise data file");
    const data = value as Data;
    if (data.version !== 1 || !Array.isArray(data.people) || !Array.isArray(data.sessions) || !Array.isArray(data.challenges) || !Array.isArray(data.promises)) throw new Error("Invalid promise data file");
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
}

async function change<T>(update: (data: Data) => T): Promise<T> {
  await mkdir(dirname(dataPath), { recursive: true });
  const started = Date.now();
  let lock: Awaited<ReturnType<typeof open>> | undefined;
  while (!lock) {
    try {
      lock = await open(lockPath, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const age = await stat(lockPath).then((value) => Date.now() - value.mtimeMs).catch(() => 0);
      if (age > 30_000) await unlink(lockPath).catch(() => undefined);
      if (Date.now() - started > 5_000) throw new Error("Promise data is busy");
      await new Promise((done) => setTimeout(done, 20));
    }
  }

  const temp = `${dataPath}.${randomUUID()}.tmp`;
  try {
    const data = await read();
    const result = update(data);
    const file = await open(temp, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(data, null, 2));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temp, dataPath);
    return result;
  } finally {
    await unlink(temp).catch(() => undefined);
    await lock.close();
    await unlink(lockPath).catch(() => undefined);
  }
}

function view(row: PromiseRecord, personId?: string | null): HumanPromise {
  return {
    id: row.id,
    item: row.item,
    deadline: row.deadline,
    note: row.note,
    createdAt: row.createdAt,
    status: row.status,
    borrowerVerified: true,
    lenderVerified: Boolean(row.lenderId),
    kind: row.kind ?? "RETURN",
    ...(row.showUp ? { showUp: row.showUp } : {}),
    ...(row.fulfilledAt ? { fulfilledAt: row.fulfilledAt } : {}),
    ...(row.durationLabel ? { durationLabel: row.durationLabel } : {}),
    ...(row.icon ? { icon: row.icon } : {}),
    ...(personId === row.borrowerId ? { myRole: "borrower" as const } : personId === row.lenderId ? { myRole: "lender" as const } : {}),
  };
}


export async function createChallenge(nonce: string, action: string, expiresAt: number) {
  await change((data) => {
    data.challenges = data.challenges.filter((challenge) => challenge.expiresAt > Math.floor(Date.now() / 1000));
    data.challenges.push({ nonce, action, expiresAt, used: false });
  });
}

export async function consumeChallenge(nonce: string, action: string) {
  return change((data) => {
    const challenge = data.challenges.find((entry) => entry.nonce === nonce && entry.action === action && !entry.used && entry.expiresAt > Math.floor(Date.now() / 1000));
    if (!challenge) return false;
    challenge.used = true;
    return true;
  });
}

function createSession(data: Data, personId: string) {
  const token = randomBytes(32).toString("base64url");
  data.sessions = data.sessions.filter((session) => session.expiresAt > Date.now());
  data.sessions.push({ tokenHash: hash(token), personId, expiresAt: Date.now() + 30 * 86_400_000 });
  return token;
}

export async function loginByNullifier(nullifier: string) {
  return change((data) => {
    let person = data.people.find((entry) => entry.worldNullifier === nullifier);
    if (!person) {
      person = { id: randomUUID(), worldNullifier: nullifier, createdAt: new Date().toISOString() };
      data.people.push(person);
    }
    return createSession(data, person.id);
  });
}

export async function loginByWorldSession(sessionId: string) {
  return change((data) => {
    let person = data.people.find((entry) => entry.sessionId === sessionId);
    if (!person) {
      person = { id: randomUUID(), sessionId, createdAt: new Date().toISOString() };
      data.people.push(person);
    }
    return createSession(data, person.id);
  });
}

export async function loginByOidcSub(oidcSub: string) {
  return change((data) => {
    let person = data.people.find((entry) => entry.oidcSub === oidcSub);
    if (!person) {
      person = { id: randomUUID(), oidcSub, createdAt: new Date().toISOString() };
      data.people.push(person);
    }
    return createSession(data, person.id);
  });
}

export async function currentPerson(token?: string) {
  if (!token) return null;
  const session = (await read()).sessions.find((entry) => entry.tokenHash === hash(token) && entry.expiresAt > Date.now());
  return session?.personId ?? null;
}

export async function logout(token?: string) {
  if (!token) return;
  await change((data) => { data.sessions = data.sessions.filter((entry) => entry.tokenHash !== hash(token)); });
}

export async function getPromise(id: string, personId?: string | null) {
  const row = (await read()).promises.find((entry) => entry.id === id);
  return row ? view(row, personId) : null;
}

export async function getBorrowerHistoryForPromise(id: string, viewerId: string): Promise<BorrowerHistory | null> {
  const data = await read();
  const requested = data.promises.find((entry) => entry.id === id);
  if (!requested || (requested.kind ?? "RETURN") !== "RETURN" || requested.status !== "REQUESTED" || requested.borrowerId === viewerId) return null;

  const history: BorrowerHistory = { total: 0, returnedOnTime: 0, returnedLate: 0, active: 0, overdue: 0 };
  const now = Date.now();
  for (const entry of data.promises) {
    if (entry.id === requested.id || entry.borrowerId !== requested.borrowerId || entry.kind === "SHOW_UP") continue;
    if (entry.status === "FULFILLED" && entry.fulfilledAt) {
      if (Date.parse(entry.fulfilledAt) <= Date.parse(entry.deadline)) history.returnedOnTime += 1;
      else history.returnedLate += 1;
    } else if (entry.status === "ACTIVE" || entry.status === "RETURN_REQUESTED") {
      if (Date.parse(entry.deadline) <= now) history.overdue += 1;
      else history.active += 1;
    } else {
      continue;
    }
    history.total += 1;
  }
  return history;
}

export async function listPromises(personId: string) {
  return (await read()).promises
    .filter((entry) => entry.borrowerId === personId || entry.lenderId === personId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => view(entry, personId));
}

export async function createPromise(personId: string, item: string, deadline: string, note: string, icon?: string) {
  return change((data) => {
    const row: PromiseRecord = { id: randomUUID(), item, deadline, note, createdAt: new Date().toISOString(), status: "REQUESTED", borrowerId: personId, icon };
    data.promises.push(row);
    return view(row, personId);
  });
}

export async function createShowUpPromise(personId: string, scheduledAt: string, note: string, showUp: ShowUpDetails) {
  return change((data) => {
    const row: PromiseRecord = {
      id: randomUUID(),
      item: `Show up at ${showUp.centerTime}`,
      deadline: scheduledAt,
      note,
      createdAt: new Date().toISOString(),
      status: "COMMITTED",
      borrowerId: personId,
      kind: "SHOW_UP",
      showUp,
      icon: "CalendarCheck2",
    };
    data.promises.push(row);
    return view(row, personId);
  });
}

export async function transition(id: string, from: PromiseStatus, to: PromiseStatus, personId: string, role: PromiseRole) {
  return change((data) => {
    const row = data.promises.find((entry) => entry.id === id && entry.status === from && (role === "borrower" ? entry.borrowerId : entry.lenderId) === personId);
    if (!row) return false;
    row.status = to;
    if (to === "FULFILLED") row.fulfilledAt = new Date().toISOString();
    return true;
  });
}

export async function joinPromise(id: string, personId: string) {
  return change((data) => {
    const row = data.promises.find((entry) => entry.id === id && entry.status === "REQUESTED" && entry.borrowerId !== personId && !entry.lenderId);
    if (!row) return false;
    row.lenderId = personId;
    row.status = "HANDOVER_PENDING";
    return true;
  });
}

export async function createB2CPromise(merchantId: string, item: string, deadline: string, note: string, durationLabel?: string, icon?: string) {
  return change((data) => {
    const row: PromiseRecord = {
      id: randomUUID(),
      item,
      deadline,
      note,
      createdAt: new Date().toISOString(),
      status: "REQUESTED",
      borrowerId: "", // unassigned until customer scans and borrows
      lenderId: merchantId,
      kind: "B2C",
      durationLabel,
      icon,
    };
    data.promises.push(row);
    return view(row, merchantId);
  });
}

export async function listMerchantPromises(merchantId: string) {
  return (await read()).promises
    .filter((entry) => entry.kind === "B2C" && entry.lenderId === merchantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => view(entry, merchantId));
}

export async function borrowB2CPromise(id: string, customerId: string) {
  return change((data) => {
    const row = data.promises.find((entry) => entry.id === id && entry.kind === "B2C" && entry.status === "REQUESTED");
    if (!row) return null;
    if (row.lenderId === customerId) return null; // cannot borrow own item
    row.borrowerId = customerId;
    row.status = "ACTIVE";
    return view(row, customerId);
  });
}

export async function cancelHandover(id: string, personId: string) {
  return change((data) => {
    const row = data.promises.find((entry) => entry.id === id && entry.status === "HANDOVER_PENDING" && entry.lenderId === personId);
    if (!row) return false;
    delete row.lenderId;
    row.status = "REQUESTED";
    return true;
  });
}
