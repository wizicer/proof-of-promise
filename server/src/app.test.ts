import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
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
  process.env.WORLD_ENV = "staging";
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

async function callMcp(promiseId: string, id: number, method: string, params: Record<string, unknown> = {}) {
  const response = await fetch(`${origin}/mcp?promiseId=${encodeURIComponent(promiseId)}`, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  assert.equal(response.status, 200);
  const body = await response.text();
  const payload = response.headers.get("content-type")?.includes("text/event-stream")
    ? body.split("\n").find((line) => line.startsWith("data: "))?.slice(6)
    : body;
  assert.ok(payload);
  return JSON.parse(payload) as { result: Record<string, unknown> };
}

test("MCP exposes only boolean verification for committed show-up promises", async () => {
  const { createPromise, createShowUpPromise, currentPerson, loginByWorldSession } = await import("./store.js");
  const person = (await currentPerson(await loginByWorldSession("session_mcp-verification")))!;
  const deadline = new Date(Date.now() + 3_600_000).toISOString();
  const showUp = await createShowUpPromise(person, deadline, "private note", {
    latitude: 35.6812,
    longitude: 139.7671,
    radiusMeters: 500,
    centerTime: "18:00",
    windowHours: 2,
    timezone: "Asia/Tokyo",
  });
  const peer = await createPromise(person, "Umbrella", deadline, "");

  const listed = await callMcp(showUp.id, 1, "tools/list");
  assert.deepEqual((listed.result.tools as Array<{ name: string }>).map((tool) => tool.name), ["verify_promise"]);

  for (const [promiseId, verified] of [[showUp.id, true], [peer.id, false], ["missing", false]] as const) {
    const called = await callMcp(promiseId, verified ? 2 : 3, "tools/call", { name: "verify_promise", arguments: {} });
    assert.deepEqual(called.result.structuredContent, { verified });
    assert.deepEqual(called.result.content, [{ type: "text", text: JSON.stringify({ verified }) }]);
  }
});

test("merchant completion cannot bypass the peer-to-peer return flow", async () => {
  const {
    borrowB2CPromise,
    createB2CPromise,
    createPromise,
    currentPerson,
    finishMerchantPromise,
    joinPromise,
    loginByWorldSession,
    transition,
  } = await import("./store.js");
  const borrower = (await currentPerson(await loginByWorldSession("session_state-machine-borrower")))!;
  const lender = (await currentPerson(await loginByWorldSession("session_state-machine-lender")))!;
  const customer = (await currentPerson(await loginByWorldSession("session_state-machine-customer")))!;
  const deadline = new Date(Date.now() + 3_600_000).toISOString();

  const peerPromise = await createPromise(borrower, "Peer umbrella", deadline, "");
  assert.equal(await joinPromise(peerPromise.id, lender), true);
  assert.equal(await transition(peerPromise.id, "HANDOVER_PENDING", "ACTIVE", borrower, "borrower"), true);
  assert.equal(await finishMerchantPromise(peerPromise.id, lender), false);

  const merchantPromise = await createB2CPromise(lender, "Shop umbrella", deadline, "");
  assert.ok(await borrowB2CPromise(merchantPromise.id, customer));
  assert.equal(await finishMerchantPromise(merchantPromise.id, lender), true);
});

test("restores the same account and activity after logout", async () => {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    if (String(input).startsWith("https://developer.world.org/")) {
      const submitted = JSON.parse(String(init?.body)) as { action?: string; session_id?: string };
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        environment: "staging",
        ...(submitted.session_id ? { session_id: submitted.session_id } : { nullifier: `0x${"12".repeat(32)}` }),
      }), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return nativeFetch(input, init);
  }) as typeof fetch;

  try {
    const registrationChallenge = await fetch(`${origin}/api/rp-signature`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "borrow-from-a-human-register" }) }).then((response) => response.json()) as { nonce: string };
    const registration = await fetch(`${origin}/api/verify-proof`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idkitResponse: { nonce: registrationChallenge.nonce, action: "borrow-from-a-human-register", environment: "staging" } }) });
    assert.equal(registration.status, 200);
    let cookie = registration.headers.get("set-cookie")!.split(";", 1)[0]!;

    const created = await fetch(`${origin}/api/promises`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ item: "Test umbrella", deadline: new Date(Date.now() + 3_600_000).toISOString(), note: "survives logout" }) });
    assert.equal(created.status, 201);

    const showUp = await fetch(`${origin}/api/promises/show-up`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({
      latitude: 35.6812,
      longitude: 139.7671,
      scheduledAt: new Date(Date.now() + 7_200_000).toISOString(),
      centerTime: "18:00",
      windowHours: 2,
      timezone: "Asia/Tokyo",
      note: "Book dinner nearby",
    }) });
    assert.equal(showUp.status, 201);
    const committed = await showUp.json() as { id: string; kind: string; status: string; showUp: { radiusMeters: number } };
    assert.equal(committed.kind, "SHOW_UP");
    assert.equal(committed.status, "COMMITTED");
    assert.equal(committed.showUp.radiusMeters, 500);
    const publicPromise = await fetch(`${origin}/api/promises/${committed.id}`);
    assert.equal(publicPromise.status, 200);
    assert.equal((await publicPromise.json() as { showUp: { centerTime: string } }).showUp.centerTime, "18:00");

    const invalidShowUp = await fetch(`${origin}/api/promises/show-up`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ latitude: 91 }) });
    assert.equal(invalidShowUp.status, 400);
    assert.equal((await fetch(`${origin}/api/session`, { method: "DELETE", headers: { cookie } })).status, 200);

    const loginChallenge = await fetch(`${origin}/api/rp-signature`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "borrow-from-a-human-register" }) }).then((response) => response.json()) as { nonce: string };
    const login = await fetch(`${origin}/api/verify-proof`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idkitResponse: { nonce: loginChallenge.nonce, action: "borrow-from-a-human-register", environment: "staging" } }) });
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie")!.split(";", 1)[0]!;
    const activity = await fetch(`${origin}/api/promises`, { headers: { cookie } });
    assert.equal(activity.status, 200);
    assert.deepEqual((await activity.json() as Array<{ item: string }>).map((entry) => entry.item), ["Show up at 18:00", "Test umbrella"]);
  } finally {
    globalThis.fetch = nativeFetch;
  }
});

test("allows temporary World Session sign-in without an action", async () => {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    if (String(input).startsWith("https://developer.world.org/")) {
      const submitted = JSON.parse(String(init?.body)) as { session_id?: string };
      return Promise.resolve(new Response(JSON.stringify({ success: true, environment: "staging", session_id: submitted.session_id }), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return nativeFetch(input, init);
  }) as typeof fetch;

  try {
    const challenge = await fetch(`${origin}/api/rp-signature`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((response) => response.json()) as { nonce: string };
    const login = await fetch(`${origin}/api/verify-proof`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idkitResponse: { nonce: challenge.nonce, session_id: "session_emergency-login", environment: "staging" } }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!.split(";", 1)[0]!;
    assert.deepEqual(await fetch(`${origin}/api/session`, { headers: { cookie } }).then((response) => response.json()), { authenticated: true });
  } finally {
    globalThis.fetch = nativeFetch;
  }
});

test("supports OIDC OAuth authorization code login and persists account continuity", async () => {
  process.env.WORLD_AUTH_CLIENT_ID = "test_oidc_client";
  process.env.WORLD_AUTH_CLIENT_SECRET = "test_oidc_secret";
  process.env.WORLD_AUTH_ISSUER = "https://sandbox.auth.world.org";
  process.env.WORLD_AUTH_REDIRECT_URI = `${origin}/auth/callback`;

  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key-1";
  jwk.alg = "RS256";
  jwk.use = "sig";

  const nativeFetch = globalThis.fetch;
  let issuedIdToken: string;
  const humanSub = "pairwise_human_sub_abcdef123456";

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://sandbox.auth.world.org/.well-known/jwks.json") {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url === "https://sandbox.auth.world.org/api/v1/token") {
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get("grant_type"), "authorization_code");
      assert.equal(body.get("client_id"), "test_oidc_client");
      assert.equal(body.get("code"), "mock_auth_code_123");
      assert.equal(body.get("redirect_uri"), `${origin}/auth/callback`);
      assert(body.get("code_verifier"));

      return new Response(JSON.stringify({
        id_token: issuedIdToken,
        access_token: "mock_opaque_access_token",
        token_type: "Bearer",
        expires_in: 300,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return nativeFetch(input, init);
  }) as typeof fetch;

  try {
    // 1. Initiate OAuth
    const authStart = await fetch(`${origin}/api/auth/world-id?format=json`);
    assert.equal(authStart.status, 200);
    const startData = await authStart.json() as { url: string };
    const authUrl = new URL(startData.url);
    assert.equal(authUrl.origin, "https://sandbox.auth.world.org");
    assert.equal(authUrl.pathname, "/api/v1/authorize");
    assert.equal(authUrl.searchParams.get("client_id"), "test_oidc_client");
    const state = authUrl.searchParams.get("state")!;
    const nonce = authUrl.searchParams.get("nonce")!;
    assert(state);
    assert(nonce);

    const oidcStateCookie = authStart.headers.get("set-cookie")!.split(";", 1)[0]!;

    // 2. Sign ID token
    issuedIdToken = await new SignJWT({ nonce })
      .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
      .setIssuer("https://sandbox.auth.world.org")
      .setAudience("test_oidc_client")
      .setSubject(humanSub)
      .setExpirationTime("5m")
      .setIssuedAt()
      .sign(privateKey);

    // 3. Callback
    const callbackRes = await fetch(`${origin}/auth/callback?code=mock_auth_code_123&state=${state}`, {
      headers: { cookie: oidcStateCookie },
      redirect: "manual",
    });
    assert.equal(callbackRes.status, 302);
    assert.equal(callbackRes.headers.get("location"), "/");

    let sessionCookie = callbackRes.headers.get("set-cookie")!.split(";", 1)[0]!;

    // 4. Verify session is active and create a promise
    const sessionRes = await fetch(`${origin}/api/session`, { headers: { cookie: sessionCookie } });
    assert.deepEqual(await sessionRes.json(), { authenticated: true });

    const createPromiseRes = await fetch(`${origin}/api/promises`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: sessionCookie },
      body: JSON.stringify({ item: "OIDC continuity item", deadline: new Date(Date.now() + 3600000).toISOString(), note: "OIDC test" }),
    });
    assert.equal(createPromiseRes.status, 201);

    // 5. Logout
    await fetch(`${origin}/api/session`, { method: "DELETE", headers: { cookie: sessionCookie } });
    const loggedOutCheck = await fetch(`${origin}/api/session`, { headers: { cookie: sessionCookie } });
    assert.deepEqual(await loggedOutCheck.json(), { authenticated: false });

    // 6. Sign in again with the SAME humanSub (new state, new code, new nonce)
    const secondStart = await fetch(`${origin}/api/auth/world-id?format=json`);
    const secondStartData = await secondStart.json() as { url: string };
    const secondAuthUrl = new URL(secondStartData.url);
    const secondState = secondAuthUrl.searchParams.get("state")!;
    const secondNonce = secondAuthUrl.searchParams.get("nonce")!;
    const secondOidcStateCookie = secondStart.headers.get("set-cookie")!.split(";", 1)[0]!;

    issuedIdToken = await new SignJWT({ nonce: secondNonce })
      .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
      .setIssuer("https://sandbox.auth.world.org")
      .setAudience("test_oidc_client")
      .setSubject(humanSub) // SAME SUB!
      .setExpirationTime("5m")
      .setIssuedAt()
      .sign(privateKey);

    const secondCallbackRes = await fetch(`${origin}/auth/callback?code=mock_auth_code_123&state=${secondState}`, {
      headers: { cookie: secondOidcStateCookie },
      redirect: "manual",
    });
    assert.equal(secondCallbackRes.status, 302);
    sessionCookie = secondCallbackRes.headers.get("set-cookie")!.split(";", 1)[0]!;

    // 7. Verify the user is back to the SAME account with previous promise!
    const activityRes = await fetch(`${origin}/api/promises`, { headers: { cookie: sessionCookie } });
    assert.equal(activityRes.status, 200);
    const activity = await activityRes.json() as Array<{ item: string }>;
    assert.equal(activity.length, 1);
    assert.equal(activity[0]!.item, "OIDC continuity item");
  } finally {
    globalThis.fetch = nativeFetch;
  }
});
