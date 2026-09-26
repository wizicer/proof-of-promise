import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { createApp } from "./app.js";

let server: Server;
let origin: string;

before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind");
  origin = `http://127.0.0.1:${address.port}`;
});

after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

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
