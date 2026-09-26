import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { createApp as CreateApp } from "./app.js";

let server: Server;
let origin: string;
let testDirectory: string;
let createApp: typeof CreateApp;

before(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), "borrow-from-a-human-test-"));
  process.env.PROMISE_DATA_PATH = join(testDirectory, "store.json");
  process.env.WORLD_RP_ID = "rp_1234567890abcdef";
  process.env.WORLD_RP_SIGNING_KEY = "11".repeat(32);
  ({ createApp } = await import("./app.js"));
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind");
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(testDirectory, { recursive: true, force: true });
});

test("health endpoint is available", async () => {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
  assert.deepEqual(await response.json(), { ok: true });
});

test("preserves a safe caller request id for log correlation", async () => {
  const response = await fetch(`${origin}/api/health`, { headers: { "x-request-id": "browser_debug_1234" } });
  assert.equal(response.headers.get("x-request-id"), "browser_debug_1234");
});

test("private promise list requires a session", async () => {
  const response = await fetch(`${origin}/api/promises`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Sign in first" });
});

test("missing promise returns a public not-found response", async () => {
  const response = await fetch(`${origin}/api/promises/not-a-promise`);
  assert.equal(response.status, 404);
});

test("restores the same account and activity after logout", async () => {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    if (String(input).startsWith("https://developer.world.org/")) {
      const submitted = JSON.parse(String(init?.body)) as { action?: string; session_id?: string };
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        environment: "staging",
        ...(submitted.action ? { nullifier: `0x${"12".repeat(32)}` } : { session_id: submitted.session_id }),
      }), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return nativeFetch(input, init);
  }) as typeof fetch;

  try {
    const registrationChallenge = await fetch(`${origin}/api/rp-signature`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "borrow-from-a-human-register" }) }).then((response) => response.json()) as { nonce: string };
    const registration = await fetch(`${origin}/api/verify-proof`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idkitResponse: { nonce: registrationChallenge.nonce, action: "borrow-from-a-human-register", environment: "staging" } }) });
    assert.equal(registration.status, 200);
    let cookie = registration.headers.get("set-cookie")!.split(";", 1)[0]!;

    const bindingChallenge = await fetch(`${origin}/api/rp-signature`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((response) => response.json()) as { nonce: string };
    const binding = await fetch(`${origin}/api/verify-proof`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ idkitResponse: { nonce: bindingChallenge.nonce, session_id: "session_test-account", environment: "staging" } }) });
    assert.equal(binding.status, 200);
    const { loginHandle } = await binding.json() as { loginHandle: string };
    assert.match(loginHandle, /^[A-Za-z0-9_-]{32}$/);

    const created = await fetch(`${origin}/api/promises`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ item: "Test umbrella", deadline: new Date(Date.now() + 3_600_000).toISOString(), note: "survives logout" }) });
    assert.equal(created.status, 201);
    assert.equal((await fetch(`${origin}/api/session`, { method: "DELETE", headers: { cookie } })).status, 200);

    const context = await fetch(`${origin}/api/auth/login-context`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ loginHandle }) });
    assert.deepEqual(await context.json(), { sessionId: "session_test-account" });
    const loginChallenge = await fetch(`${origin}/api/rp-signature`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((response) => response.json()) as { nonce: string };
    const login = await fetch(`${origin}/api/verify-proof`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idkitResponse: { nonce: loginChallenge.nonce, session_id: "session_test-account", environment: "staging" } }) });
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie")!.split(";", 1)[0]!;
    const activity = await fetch(`${origin}/api/promises`, { headers: { cookie } });
    assert.equal(activity.status, 200);
    assert.deepEqual((await activity.json() as Array<{ item: string }>).map((entry) => entry.item), ["Test umbrella"]);
  } finally {
    globalThis.fetch = nativeFetch;
  }
});
