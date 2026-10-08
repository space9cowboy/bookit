/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Bugs front injectables, lus au build : "A11Y", "UI_TOTAL" ou "A11Y,UI_TOTAL". */
  readonly VITE_BUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
