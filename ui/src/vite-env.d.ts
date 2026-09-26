/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORLD_APP_ID: `app_${string}`;
  readonly VITE_WORLD_ENV?: "production" | "staging";
}

interface ImportMeta { readonly env: ImportMetaEnv }
