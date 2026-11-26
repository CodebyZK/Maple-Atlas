/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_API_URL?: string;
  readonly VITE_BEACON_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
