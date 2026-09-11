/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Firebase web config — all four optional. Unset = app runs fully local, no Firebase project needed. */
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
