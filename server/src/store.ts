import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { HumanPromise, PromiseKind, PromiseRole, PromiseStatus, ShowUpDetails } from "./types.js";

type Person = { id: string; loginHandle?: string; sessionId?: string; worldNullifier?: string; createdAt: string };
type Session = { tokenHash: string; personId: string; expiresAt: number };
type Challenge = { nonce: string; action: string; expiresAt: number; used: boolean };
type PromiseRecord = { id: string; item: string; deadline: string; note: string; createdAt: string; status: PromiseStatus; borrowerId: string; lenderId?: string; fulfilledAt?: string; kind?: PromiseKind; showUp?: ShowUpDetails };
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

function createLoginHandle(data: Data) {
  let handle: string;
  do handle = randomBytes(24).toString("base64url");
  while (data.people.some((person) => person.loginHandle === handle));
  return handle;
}

export async function registerByNullifier(nullifier: string) {
  return change((data) => {
    let person = data.people.find((entry) => entry.worldNullifier === nullifier);
    if (!person) {
      person = { id: randomUUID(), loginHandle: createLoginHandle(data), worldNullifier: nullifier, createdAt: new Date().toISOString() };
      data.people.push(person);
    }
    if (!person.loginHandle) person.loginHandle = createLoginHandle(data);
    return { token: createSession(data, person.id), needsSessionBinding: !person.sessionId };
  });
}

export async function bindWorldSession(personId: string, sessionId: string) {
  return change((data) => {
    const person = data.people.find((entry) => entry.id === personId);
    if (!person) return null;
    const owner = data.people.find((entry) => entry.sessionId === sessionId);
    if (owner && owner.id !== personId) return null;
    if (person.sessionId && person.sessionId !== sessionId) return null;
    person.sessionId = sessionId;
    if (!person.loginHandle) person.loginHandle = createLoginHandle(data);
    return person.loginHandle;
  });
}

export async function findWorldSession(loginHandle: string) {
  const person = (await read()).people.find((entry) => entry.loginHandle === loginHandle);
  return person?.sessionId ?? null;
}

export async function ensureLoginHandle(personId: string) {
  return change((data) => {
    const person = data.people.find((entry) => entry.id === personId);
    if (!person || !person.sessionId) return null;
    if (!person.loginHandle) person.loginHandle = createLoginHandle(data);
    return person.loginHandle;
  });
}

export async function loginByBoundSession(sessionId: string) {
  return change((data) => {
    const person = data.people.find((entry) => entry.sessionId === sessionId);
    return person ? createSession(data, person.id) : null;
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

export async function listPromises(personId: string) {
  return (await read()).promises
    .filter((entry) => entry.borrowerId === personId || entry.lenderId === personId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => view(entry, personId));
}

export async function createPromise(personId: string, item: string, deadline: string, note: string) {
  return change((data) => {
    const row: PromiseRecord = { id: randomUUID(), item, deadline, note, createdAt: new Date().toISOString(), status: "REQUESTED", borrowerId: personId };
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

export async function cancelHandover(id: string, personId: string) {
  return change((data) => {
    const row = data.promises.find((entry) => entry.id === id && entry.status === "HANDOVER_PENDING" && entry.lenderId === personId);
    if (!row) return false;
    delete row.lenderId;
    row.status = "REQUESTED";
    return true;
  });
}
