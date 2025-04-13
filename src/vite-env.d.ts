/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_INITIAL_BALANCE: string
  readonly VITE_MIN_BET: string
  readonly VITE_MAX_BET: string
  readonly VITE_ENABLE_TOURNAMENTS: string
  readonly VITE_ENABLE_ACHIEVEMENTS: string
  readonly VITE_ENABLE_CHAT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}