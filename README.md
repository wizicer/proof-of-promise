# Borrow From A Human

**Proof of Promise** — *A promise you can make to a stranger.*

A tiny ETHGlobal Tokyo 2026 MVP for lending a physical item to a stranger without collecting their name, phone number, passport, public profile, or deposit.

## Demo flow

1. Lender creates a promise: `USB-C Charger`, return by `22:00`.
2. Lender proves they are a human with World ID.
3. The app creates a QR code.
4. Borrower scans it and proves they are a human.
5. The promise becomes active.
6. Borrower requests return.
7. Lender confirms the physical item is back.
8. Both see a **Proof of Promise — Fulfilled** card.

## Why World ID?

The trust moment is not login. It is the moment a stranger accepts a real-world promise.

World ID supplies the minimum assurance needed: **there is one real human behind each side of the promise**. The app intentionally does not request passport identity, nationality, name, phone number, or a public reputation score.

## Run immediately (demo mode)

```bash
cp .env.example .env.local
npm install
npm run dev
```

Keep `NEXT_PUBLIC_DEMO_MODE=true`. This bypasses the World UI so the whole product flow can be tested with two browser windows.

## Enable real World ID 4.0

Create an app/RP in the World Developer Portal and fill:

```env
NEXT_PUBLIC_WORLD_APP_ID=app_...
WORLD_RP_ID=rp_...
WORLD_RP_SIGNING_KEY=0x...
NEXT_PUBLIC_WORLD_ENV=staging
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_BASE_URL=https://YOUR-PUBLIC-HTTPS-URL
```

The implementation:
- generates RP signatures **server-side**
- uses `proofOfHuman(...)`
- forwards the IDKit result to World's `/api/v4/verify/{rp_id}` endpoint **server-side**
- binds each verification to the Promise ID via `signal`
- keeps the signing key off the client

For development, use World's simulator with `NEXT_PUBLIC_WORLD_ENV=staging`.

## Hackathon failure path

Cancel/reject World verification: the Promise does not advance. The protected action only runs from `onSuccess` after `handleVerify` has accepted the backend verification.

The app also rejects:
- accepting a Promise that is not open
- self-borrowing when the lender/borrower proof resolves to the same nullifier
- confirming a return before the borrower requests it

## Important MVP limitation

The Promise store is intentionally in-memory to keep the hackathon prototype tiny. A server restart clears records. Before a public deployment, replace `lib/store.ts` with Postgres/Redis and add authenticated role/session binding so only the actual borrower can request a return and only the actual lender can confirm it.

For judging, the next hardening step should be session-based role authorization after World verification.

## World prize debrief checklist

Add `FEEDBACK.md` before submission with:
- time to first successful IDKit verification
- friction encountered
- missing capability/documentation
- the single improvement with greatest impact

## Product line

> Because sometimes you don't need to know who someone is. You just need a human to stand behind a promise.
