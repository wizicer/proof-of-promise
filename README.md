# Borrow From A Human

A mobile-first Proof of Promise app for borrowing an item from another verified human.

The active project is intentionally split into two independent applications:

- `ui/` — React 19, Vite, Tailwind CSS, Shadcn UI, and World ID IDKit
- `server/` — Node.js, Express, TypeScript, and atomic JSON persistence
- `Legacy/` — the archived Next.js implementation

## Local development

Copy `.env.example` to the repository-root `.env.local`. Both Vite and Express load that shared file: the UI uses `VITE_WORLD_APP_ID` and `VITE_WORLD_ENV`; the server uses `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY`, and `WORLD_ENV`.

```bash
npm install
npm --prefix server install
npm --prefix ui install
npm run dev
```

The root `dev` command starts Express and Vite together. Open `http://localhost:3000`: Express is the only externally reachable entry point and transparently proxies pages and HMR to Vite's loopback-only listener. To run only one side, use `npm run dev:server` or `npm run dev:ui`.

For a production-equivalent single-port build:

```bash
npm run build
npm start
```

In production, Express serves both `/api/*` and the compiled React application from `ui/dist` on `http://localhost:3000`; Vite does not run.

## Promise flow

1. Sign in with World ID.
2. Create a lend promise with an item, return deadline, and optional note.
3. The lender opens the QR/link and agrees to hand over the item.
4. The borrower confirms physical receipt.
5. The borrower hands the item back and requests return confirmation.
6. The lender inspects the item and completes the promise.

Run `npm run build` in both application directories and `npm test` in `server/` before release.
