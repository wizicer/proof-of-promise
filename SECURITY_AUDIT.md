# Security Audit: Borrow From A Human MVP

**Date:** 2026-09-25

**Scope:** The current Next.js Promise and World ID integration in this repository.
**Method:** Manual source review of the API routes, IDKit integration, and in-memory store. This report does not claim a penetration test or a successful end-to-end production World ID verification.

## Executive summary

The current application is suitable for a controlled prototype, but its displayed human-verification and fulfillment claims are not trustworthy on a public deployment. World ID verification runs in a separate API request from the business-state changes. The state-changing routes then trust client-supplied proof data or no identity at all. These are application integration flaws, not inherent limitations of the World ID SDK.

## Findings

### F1 — Critical: Human verification can be bypassed at the state-changing routes

**Evidence:** `app/api/promises/[id]/route.ts:10-18`, `app/api/promises/[id]/accept/route.ts:5-13`, `lib/world.ts:1-6`, and `components/HumanVerifyButton.tsx:54-64`.

The browser calls `/api/verify-proof` first, but the publish and accept routes do not consume a trusted server-side verification result. They only extract a `nullifier` from a JSON object supplied by the caller. A caller can therefore submit fabricated proof-shaped data directly to those routes and create lender and borrower records without a valid World ID proof. The different-nullifier check in the accept route does not help when both values are attacker-controlled.

**Impact:** The UI can show two “Human verified” participants and an active Promise without either participant passing World ID verification.

**Recommendation:** Verify the complete IDKit result inside the publish/accept transaction or exchange a successful verification for a short-lived, one-use, server-issued authorization bound to the Promise ID, role, action, nullifier, and session. Reject every state change lacking that authorization.

### F2 — Critical: Return and fulfillment have no role authorization

**Evidence:** `app/api/promises/[id]/request-return/route.ts:3-7` and `app/api/promises/[id]/confirm/route.ts:3-7`.

These routes check only the current Promise status. They do not authenticate the caller or confirm that the borrower requested return and the lender confirmed receipt.

**Impact:** Anyone with the Promise URL can advance an active Promise to `RETURN_REQUESTED` and then `FULFILLED`, producing a false “Proof of Promise.”

**Recommendation:** Establish server-side lender and borrower sessions after verified enrollment. Authorize `request-return` only for the borrower and `confirm` only for the lender. Record the actor and time of each transition.

### F3 — High: A valid proof is not bound to the specific business operation

**Evidence:** `app/api/verify-proof/route.ts:3-18`, `components/HumanVerifyButton.tsx:53-64`, and the publish/accept routes cited in F1.

The client supplies the Promise ID as the IDKit `signal`, but the backend does not verify that the returned proof's signal corresponds to the route's Promise ID. It also does not enforce the expected action, role, nonce, or one-use status when changing Promise state. Even after adding a basic proof-validity check, this missing binding would leave room for proof replay or use in the wrong context.

**Impact:** A proof obtained for one request may be applied to a different Promise or role if the server accepts it without contextual checks.

**Recommendation:** Bind and validate the action, Promise ID or signal hash, intended role, nonce, and verified nullifier on the server. Consume the authorization once. Follow World ID's guidance to enforce the application context carried by `signal`.

### F4 — Medium: Public Promise responses expose nullifiers

**Evidence:** `app/api/promises/[id]/route.ts:5-7` returns the complete Promise object, including `lender.nullifier` and `borrower.nullifier`.

A person with the shared Promise URL can retrieve both stable, application-scoped pseudonymous identifiers. The page only needs verification booleans, not the identifiers themselves.

**Impact:** Unnecessary disclosure and correlation of participant activity within the application's nullifier scope.

**Recommendation:** Return a public DTO with only status and display-safe fields. Keep nullifiers in server-side records used for authorization and duplicate checks.

### F5 — Medium: RP signature endpoint signs caller-selected actions

**Evidence:** `app/api/rp-signature/route.ts:4-10`.

The endpoint accepts any `action` string from an unauthenticated caller and signs it with the registered RP key. It does not constrain actions to those used by this app or rate-limit requests.

**Impact:** The endpoint acts as an unrestricted signing oracle for this RP and can be abused to generate requests outside the intended flow or consume resources.

**Recommendation:** Allowlist the supported action or derive it on the server from a validated operation. Add basic rate limiting and request validation.

## Operational and product limitations

- **In-memory storage:** `lib/store.ts:3-13` loses Promises on restart and will not share state across server instances. Use durable storage with atomic state transitions before deployment.
- **One-time action design:** Both roles currently use the fixed `promise-lender` action. A user who has already verified that action sees “Already verified,” so repeat lending is not supported. Design a per-Promise action or a World ID session flow while preserving the ability to compare participants safely.
- **No fresh presence check:** The IDKit widget requests `proofOfHuman({ signal })` but does not set `require_user_presence`. The flow requests a valid human credential, not an additional fresh liveness check for each Promise.
- **Demo mode:** `NEXT_PUBLIC_DEMO_MODE=true` deliberately bypasses World ID. Keep it disabled outside an explicitly labeled local demo.

## Remediation order

1. Make server-verified proof mandatory for lender publication and borrower acceptance, bound to the exact Promise and role.
2. Add authenticated role sessions to the return and confirmation routes.
3. Stop exposing nullifiers in public API responses and restrict RP signing.
4. Replace the memory store and design a repeatable World ID verification flow.
5. Add tests that call the HTTP routes directly with forged or replayed payloads and verify rejection.

## References

- [World ID IDKit integration](https://docs.world.org/world-id/idkit/integrate)
- [World ID credential configuration and signal guidance](https://docs.world.org/world-id/idkit/credentials)
- [World ID Verify API](https://docs.world.org/api-reference/developer-portal/verify)
