# Borrow From A Human

A C2C Proof of Promise application based on `prototype.html`.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Use two World ID accounts in separate browser profiles for the borrower and lender; ordinary windows share the same session cookie. For phone QR scanning, use a public HTTPS URL rather than localhost. Data persists in `.data/store.json` (or `PROMISE_DATA_PATH`). Keep that path on a persistent volume for deployment.

## C2C flow

1. Borrower verifies World ID and creates a request with an item, deadline and optional memo.
2. Borrower shows the request QR. Lender opens it on their device, verifies World ID and agrees to hand over the item.
3. Borrower checks the physical item and confirms receipt. Borrowing becomes active.
4. Borrower hands the item back and requests return confirmation.
5. Lender inspects the item and confirms return. Both see the fulfilled record in **My Promises**.

The lender may cancel an unconfirmed handover; the borrower may cancel a pending return request. Both roles are linked to the server-side World ID account record. The public request API never returns a nullifier. Each state transition checks the authenticated role and expected prior state under a file lock with an atomic JSON-file replacement.

## World ID setup

Fill `NEXT_PUBLIC_WORLD_APP_ID`, `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY`, and `NEXT_PUBLIC_WORLD_ENV` in `.env.local`. The Portal must have the `promise-participant` action. The backend signs a fresh RP challenge, verifies the complete IDKit result with World, checks the action/environment/nonce/nullifier, then issues a 30-day HttpOnly session cookie. The top-right Live check toggle optionally requests fresh user presence during verification.

**Account recovery limitation:** `proofOfHuman` uniqueness actions can be completed once per person. The 30-day local cookie lets the user revisit their records while it remains valid, but a lost/expired cookie cannot currently reauthenticate through the same one-time action. Before real users rely on long-term history, add a World ID session-proof recovery flow or an appropriate repeatable sign-in configuration. The server-side JSON file also needs backups and a persistent host volume. Real World ID success requires a person to complete the World App flow; automated tests check only server-side rejection paths.

## Design

- **One account, two roles:** A verified person can create requests as borrower and join other requests as lender. The history list labels each role.
- **Shared request page:** The QR opens `/p/[id]` on a second device. Both devices see the same persisted state; controls appear only for the relevant role.
- **Physical trust moments:** Lender's agreement records intended handover, borrower's receipt activates the loan, and lender's return confirmation completes it. These buttons record human attestations; World ID does not verify the physical object.
- **Data model:** `people` stores an app-scoped World nullifier; `promises` stores item, deadline, memo, status and both person IDs; `sessions` stores hashed bearer tokens; `challenges` prevents request replay. Public DTOs expose status and role only.
