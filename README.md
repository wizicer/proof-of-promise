# Borrow From A Human

A mobile-first Proof of Promise app for borrowing an item from another verified human.

The active project is intentionally split into two independent applications:

- `ui/` — React 19, Vite, Tailwind CSS, Shadcn UI, and World ID IDKit
- `server/` — Node.js, Express, TypeScript, and atomic JSON persistence
- `Legacy/` — the archived Next.js implementation

## Local development

Copy `.env.example` to `.env.local`, then expose the variables to each process using your preferred environment loader. The UI needs `VITE_WORLD_APP_ID` and `VITE_WORLD_ENV`; the server needs `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY`, and `WORLD_ENV`.

```bash
npm install
npm --prefix server install
npm --prefix ui install
npm run dev
```

The root `dev` command starts Express and Vite together. To run only one side, use `npm run dev:server` or `npm run dev:ui`.

Open `http://localhost:5173`. Vite proxies `/api` to Express at `http://localhost:3001`.

## Promise flow

1. Sign in with World ID.
2. Create a lend promise with an item, return deadline, and optional note.
3. The lender opens the QR/link and agrees to hand over the item.
4. The borrower confirms physical receipt.
5. The borrower hands the item back and requests return confirmation.
6. The lender inspects the item and completes the promise.

Run `npm run build` in both application directories and `npm test` in `server/` before release.
