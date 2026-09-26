---
name: scaffolding-react-vite-frontend
description: Generates production-ready React components and layouts using Vite, Tailwind CSS, Shadcn UI, and Lucide icons. Use this skill when the user asks for frontend code, UI components, dashboard layouts, or React project logic.
---

# Building React Vite Frontends (SPA)

## Tech Stack Guidelines
- **Core:** React 19+ with TypeScript (Strict Mode)
- **Build:** Vite
- **Styling:** Tailwind CSS (Mobile-first)
- **UI Library:** Shadcn UI (Radix based)
- **Icons:** Lucide React
- **Theming:** refer to `vite-theme.md` (System/Dark/Light)
- **Routing:** React Router DOM v6+ (if needed)
- **Data Fetching:** TanStack Query or native `fetch` (in `useEffect`)

## Core Constraints

### 1. Pure Client-Side Environment
- **NO Next.js:** Do not use `app/` directory, `getServerSideProps`, Server Components, or Server Actions.
- **Environment:** Assume code runs entirely in the browser.
- **Async Logic:** Use `useEffect` or `useQuery` for data fetching, not async components.

### 2. Modern React 19 Conventions
- **Refs:** Treat `ref` as a standard prop. Do NOT use `forwardRef`.
  - *Bad:* `const Input = forwardRef((props, ref) => ...)`
  - *Good:* `const Input = ({ ref, ...props }) => ...`
- **Memoization:** Assume React Compiler is active. Reduce manual usage of `useMemo` and `useCallback` unless strictly necessary for referential stability in complex hooks.
- **Imports:** Use standard ESM imports.

### 3. Active Build & Dependency Verification

You have access to terminal tools. **Do not guess**—execute commands to ensure the environment matches your code.

* **Shadcn UI Handling:**
  * Do **not** assume Shadcn components (e.g., `src/components/ui/button.tsx`) exist.
  * You **MUST** execute `npx shadcn@latest add <component>` for every UI component you intend to use.
* **Dependency Installation:**
  * If you import an external library (e.g., `framer-motion`, `zod`), execute `npm install <package>` first.
* **Mandatory Compilation Check:**
  * After generating or editing files, you **MUST** run `npx tsc` (to check types) or `npm run build`.
  * Verify that path aliases (`@/`) are resolving correctly during the build.
* **Self-Correction Loop:**
  * If `tsc` or `build` returns errors, analyze the output, fix the code/config, and **retry** until the exit code is 0.
  * Only output the final code after verification passes.

### 4. UI & Theming
- **Mobile-First:** Use `sm:`, `md:`, `lg:` modifiers. Base styles are always mobile.
- **Theme Support:** refer to `vite-theme.md`, unless disabled, implement light, dark, and system themes with system as default. Do not hardcode white or black backgrounds. Prefer semantic tokens and Tailwind utilities.
- **Accessibility:** Maintain Radix UI a11y standards.

## Design Considerations

### UX defaults
Include loading, error, and empty states when data or async flows exist.
Provide accessible focus styles and sensible disabled states.

### Output format
Prefer complete files over fragments.
Label each file name clearly.
Split into multiple files when complexity warrants it.

## Source Code

### Git
Assume Git version control. Include a standard `.gitignore` suitable for a Vite/React environment.

### Path Aliases
- **Convention:** Use `@/` as the alias for the `src/` directory.
- **Configuration:** Ensure the alias is configured in **BOTH** `vite.config.ts` and `tsconfig.json`.
- **Usage:** Imports must use aliases (e.g., `import { Button } from "@/components/ui/button"`).
