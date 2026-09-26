# Proof of Promise

**Proof of Promise** is a mobile-first, Sybil-resistant web application that allows verified unique humans to establish, track, and complete peer-to-peer micro-lending commitments with real-world physical verification.

The repository is an npm workspaces monorepo with two applications:

- `ui/` — React 19, Vite, Tailwind CSS, Shadcn UI, and World ID IDKit
- `server/` — Node.js, Express, TypeScript, and atomic JSON persistence
- `packages/shared/` — shared domain types and status definitions

## Principle

**Proof of Promise**  is built around a simple idea: trust should require only the minimum proof necessary.

With **Proof of Promise** , a person can prove that they are a real, unique human through World ID and make a verifiable promise without revealing their identity or unnecessary personal information. The focus is not on proving who someone is, but on proving that a real human made a specific commitment.

For example, imagine Bob is attending ETHGlobal Tokyo and his laptop is about to run out of battery. He asks Alice, a complete stranger, to borrow her charger and promises to return it in two hours. Bob creates a “Promise to Return” in the app, verifies through World ID, and generates a QR code. Alice scans the QR code and accepts the promise. Both sides now have a shared, verifiable record of the commitment without exchanging names, phone numbers, passports, or other sensitive information.

**Proof of Promise**  can support many lightweight real-world commitments beyond lending items, such as “Promise to Show Up” for appointments, meetups, reservations, or other situations where strangers need a small amount of trust before interacting.

At its core, it introduces the concept of “Proof of Promise”: a lightweight trust primitive that proves a real human made a commitment while preserving privacy.

Instead of asking for maximum personal information, **Proof of Promise** aims to create trust with minimal proof.

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

## How It's Made


### Technology Stack

- **World ID (World Auth / OAuth 2.0 & IDKit)**: Provides privacy-preserving proof-of-humanity, Sybil resistance, and cross-device account recovery.
- **React 19 & Vite 7**: The core front-end framework powering a fast, responsive mobile-first UI with PWA capabilities.
- **Tailwind CSS v4 & Lucide Icons**: Modern styling architecture ensuring polished, clean, and accessible UI interactions.
- **Node.js, Express & TypeScript**: A secure backend handling cryptographic verification, session management, and state machines.
- **Jose & Web Crypto**: Implements secure PKCE authorization code exchange and JWKS-based JWT token validation.
- **Leaflet & OpenStreetMap**: Visualizes community lending density and physical item handover points.
- **jsQR & QRCode.react**: Enables quick offline-to-online item handovers via dynamic mobile QR scanning.
- **NPM Workspaces**: Monorepo architecture sharing type-safe domain models seamlessly between client and server.

### Development Workflow

1. **Human Verification Layer**:
   - Integrated World ID's OAuth 2.0 flow with PKCE (`S256`) and cryptographically signed state cookies on the backend.
   - Verified the issued `id_token` against World's remote JWKS endpoint, mapping the deterministic human subject (`sub`) to a persistent internal profile without exposing private user data.
2. **Commitment State Machine**:
   - Modeled the complete lifecycle of a peer-to-peer promise (created, agreed, borrowed, returned, confirmed) using a strict, transactional server-side state machine.
3. **Physical Handover & Verification**:
   - Integrated dynamic QR codes and browser-based camera scanning (`jsQR`) to ensure dual-party physical presence during lending and return stages.
4. **Unified Full-Stack Architecture**:
   - Engineered an integrated development environment where Express serves as the single ingress, dynamically proxying HMR in local dev and serving optimized static assets alongside API endpoints in production.

### Unique Challenges and Notable Hacks

- **Decoupling Next.js to Vite + Express Mid-Hackathon**:  
  We initially bootstrapped with an AI-generated Next.js setup. However, as business logic grew, tightly coupled client/server components caused rapid friction, messy interfaces, and slowed down iterative prompting. Mid-hackathon, we made the bold call to migrate to a cleanly decoupled React + Express monorepo. This architectural split brought strict API boundaries, eliminated security blindspots, and dramatically accelerated our development velocity.
- **Standalone Prototyping for Complex State Transitions**:  
  Modeling multi-party promise lifecycles across both C2C (peer-to-peer) and B2C (community hub/vendor) scenarios involved intricate state permutations. Instead of fighting edge cases in the full app, we hacked together a standalone simulator page to stress-test and refine the state transition graph. Once the flow was proven robust, we ported it cleanly into production and unlocked emergent use cases along the way—such as the **"Promise of Show-up"** for mutual in-person presence commitments.
- **Navigating the IDKit vs Agent Kit Transition**:  
  We initially built with IDKit v4 but discovered it couldn't restore recurring user accounts without an already-known `session_id`, and its local simulator returned identical nullifiers across different test identities. We hacked together a rapid pivot to World Auth (OAuth 2.0), implementing an end-to-end PKCE and JWKS token verification flow on the backend to achieve true persistent human recognition.
- **Bypassing Developer Portal Domain Locks**:  
  When transitioning between local testing and public deployments, we hit the Developer Portal's 5-app quota and strict single-domain edit constraints. Working with on-site staff, we adjusted app quotas and adapted our OAuth callback state handling to smoothly bridge local development and live production URLs.
- **Frictionless QR-Based Dual-Party Handover**:  
  Bridging cryptographic human identity with physical item exchange required a smooth mobile experience. We built an in-browser scanner and dynamic token-paired QR interaction, allowing two humans to physically confirm item custody within seconds without cumbersome transaction delays.

By anchoring real-world interpersonal commitments to privacy-preserving proof of humanity, we eliminated Sybil vulnerabilities and bot manipulation, creating a transparent, human-first trust network for local communities.

