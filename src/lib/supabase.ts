import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const supabaseProjectRef = isSupabaseConfigured ? new URL(supabaseUrl).hostname.split(".")[0] : "";
const supabaseStorageKey = supabaseProjectRef ? `sb-${supabaseProjectRef}-auth-token` : "";

type BrowserLock = <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => Promise<R>;

const noOpBrowserLock: BrowserLock = async (_name, _acquireTimeout, fn) => await fn();

declare global {
  interface Window {
    __labelwiseSupabaseClient?: ReturnType<typeof createClient>;
    __labelwiseSupabaseDataClient?: ReturnType<typeof createClient>;
  }
}

function createSupabaseBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // The default Navigator LockManager path can stall getSession() in local dev,
      // which blocks every PostgREST request before it ever reaches the network.
      lock: noOpBrowserLock,
    },
  });
}

function readStoredAccessToken(): string | null {
  if (typeof window === "undefined" || !supabaseStorageKey) return null;

  try {
    const raw = window.localStorage.getItem(supabaseStorageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const candidate =
      Array.isArray(parsed) ? parsed.find((value) => value && typeof value === "object") : parsed;

    if (!candidate || typeof candidate !== "object") return null;

    if ("access_token" in candidate && typeof candidate.access_token === "string") {
      return candidate.access_token;
    }

    if (
      "currentSession" in candidate &&
      candidate.currentSession &&
      typeof candidate.currentSession === "object" &&
      "access_token" in candidate.currentSession &&
      typeof candidate.currentSession.access_token === "string"
    ) {
      return candidate.currentSession.access_token;
    }

    if (
      "session" in candidate &&
      candidate.session &&
      typeof candidate.session === "object" &&
      "access_token" in candidate.session &&
      typeof candidate.session.access_token === "string"
    ) {
      return candidate.session.access_token;
    }
  } catch (error) {
    console.warn("[LabelWise] Could not read the stored Supabase access token.", error);
  }

  return null;
}

function createSupabaseDataClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => readStoredAccessToken(),
    db: {
      timeout: 10000,
    },
  });
}

export const supabase = !isSupabaseConfigured
  ? null
  : typeof window === "undefined"
    ? createSupabaseBrowserClient()
    : (window.__labelwiseSupabaseClient ??= createSupabaseBrowserClient());

export const supabaseData = !isSupabaseConfigured
  ? null
  : typeof window === "undefined"
    ? createSupabaseDataClient()
    : (window.__labelwiseSupabaseDataClient ??= createSupabaseDataClient());
