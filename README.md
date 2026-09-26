# Borrow From A Human

A mobile-first Proof of Promise app for creating and tracking commitments between verified humans.

The repository is an npm workspaces monorepo with two applications:

- `ui/` — React 19, Vite, Tailwind CSS, Shadcn UI, and World ID IDKit
- `server/` — Node.js, Express, TypeScript, and atomic JSON persistence
- `packages/shared/` — shared domain types and status definitions

## Local development

Copy `.env.example` to the repository-root `.env.local`. The server loads the World ID RP, OAuth, environment, and persistence settings from that file.

```bash
npm install
npm run dev
```

Dependencies and their lock state are managed once from the repository root. Do not run `npm install` inside an individual workspace or commit workspace-local lockfiles.

The root `dev` command starts Express and Vite together. Open `http://localhost:3000`: Express is the only externally reachable entry point and transparently proxies pages and HMR to Vite's loopback-only listener. To run only one side, use `npm run dev:server` or `npm run dev:ui`. You can also target a workspace directly, for example `npm run lint --workspace=ui`.

For a production-equivalent single-port build:

```bash
npm run build
npm start
```

In production, Express serves both `/api/*` and the compiled React application from `ui/dist` on `http://localhost:3000`; Vite does not run.

## Borrow-and-return flow

1. Sign in with World ID.
2. Create a borrowing promise with an item, return deadline, and optional note.
3. The lender opens the QR/link and agrees to hand over the item.
4. The borrower confirms physical receipt.
5. The borrower hands the item back and requests return confirmation.
6. The lender inspects the item and completes the promise.

Run `npm run build` and `npm test` from the repository root before release.
