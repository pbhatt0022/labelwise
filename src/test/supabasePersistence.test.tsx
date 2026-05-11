import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMockState = vi.hoisted(() => ({
  current: null as ReturnType<typeof createSupabaseMock> | null,
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  get supabase() {
    return supabaseMockState.current;
  },
  get supabaseData() {
    return supabaseMockState.current;
  },
}));

import { AppStateProvider, useAppState } from "@/context/AppStateContext";
import type { ScanRecord, UserProfile } from "@/lib/types";

type DeferredResult<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): DeferredResult<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function createSelectable<T>(response: T) {
  const promise = Promise.resolve(response);
  const query = {
    eq: () => query,
    order: () => query,
    limit: () => promise,
    maybeSingle: () => promise,
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
  return query;
}

function createMutation<T>(response: Promise<T> | T) {
  const promise = Promise.resolve(response);
  return {
    eq: () => promise,
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
}

function createUpsertMutation<T>(response: Promise<T> | T) {
  const promise = Promise.resolve(response);
  const query = {
    select: () => promise,
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
  return query;
}

function createSupabaseMock(options?: {
  scanUpsertPromise?: Promise<{ error: { message: string } | null }>;
  profileUpsertPromise?: Promise<{ error: { message: string } | null }>;
  signOutPromise?: Promise<{ error: { message: string } | null }>;
  signUpResponse?: {
    data: {
      user: {
        id: string;
        email: string;
        created_at: string;
        user_metadata: { display_name: string };
      } | null;
      session: { user: { id: string; email: string; created_at: string; user_metadata: { display_name: string } } } | null;
    };
    error: { message: string } | null;
  };
}) {
  const scanUpsertPromise = options?.scanUpsertPromise ?? Promise.resolve({ error: null });
  const profileUpsertPromise = options?.profileUpsertPromise ?? Promise.resolve({ error: null });
  const signOutPromise = options?.signOutPromise ?? Promise.resolve({ error: null });
  const user = {
    id: "user-1",
    email: "demo@labelwise.app",
    created_at: "2026-05-10T00:00:00.000Z",
    user_metadata: { display_name: "Demo User" },
  };
  const signUpResponse = options?.signUpResponse ?? {
    data: { user, session: { user } },
    error: null,
  };

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn().mockResolvedValue(signUpResponse),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut: vi.fn().mockImplementation(() => signOutPromise),
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "user_profiles":
          return {
            select: vi.fn(() => createSelectable({ data: null, error: null })),
            upsert: vi.fn(() => profileUpsertPromise),
          };
        case "scan_folders":
          return {
            select: vi.fn(() => createSelectable({ data: [], error: null })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            update: vi.fn(() => createMutation({ error: null })),
            delete: vi.fn(() => createMutation({ error: null })),
          };
        case "scan_records":
          return {
            select: vi.fn(() => createSelectable({ data: [], error: null })),
            upsert: vi.fn(() => createUpsertMutation(scanUpsertPromise)),
            update: vi.fn(() => createMutation({ error: null })),
            delete: vi.fn(() => createMutation({ error: null })),
          };
        case "reflection_entries":
          return {
            select: vi.fn(() => createSelectable({ data: [], error: null })),
            upsert: vi.fn(() => Promise.resolve({ error: null })),
            delete: vi.fn(() => createMutation({ error: null })),
          };
        default:
          throw new Error(`Unexpected table requested in test: ${table}`);
      }
    }),
  };
}

function buildScanPayload(): Omit<ScanRecord, "userId" | "isFavorite"> & Partial<Pick<ScanRecord, "isFavorite">> {
  return {
    id: "scan-1",
    productName: "Protein Cereal",
    brandName: "Demo Pantry",
    ingredientText: "Whole grain oats, sugar, whey protein isolate.",
    createdAt: "2026-05-10T00:00:00.000Z",
    analysis: {
      normalizedIngredients: ["whole grain oats", "sugar", "whey protein isolate"],
      flags: [],
      overallRisk: "low",
      matchedConcernTags: [],
    },
    profileSnapshot: {
      allergies: [],
      health: [],
      diet: [],
      sensitivities: [],
      selectedConcernIds: [],
      customAvoids: [],
    },
  };
}

function buildProfilePayload(): UserProfile {
  return {
    allergies: ["Milk"],
    health: [],
    diet: ["Vegetarian"],
    sensitivities: [],
    selectedConcernIds: ["milk_allergy", "vegetarian"],
    customAvoids: [],
    dailySugarPreferenceG: 15,
  };
}

function Harness() {
  const { history, isAuthenticated, profile, saveProfile, saveScan, signIn, signOut, signUp } = useAppState();
  const [saveStatus, setSaveStatus] = useState("idle");
  const [signOutStatus, setSignOutStatus] = useState("idle");
  const [signUpStatus, setSignUpStatus] = useState("idle");
  const [profileStatus, setProfileStatus] = useState("idle");

  return (
    <div>
      <div>auth:{isAuthenticated ? "yes" : "no"}</div>
      <div>history:{history.length}</div>
      <div>profile-allergies:{profile.allergies.join(",") || "none"}</div>
      <div>save:{saveStatus}</div>
      <div>profile-save:{profileStatus}</div>
      <div>signout:{signOutStatus}</div>
      <div>signup:{signUpStatus}</div>
      <button
        type="button"
        onClick={async () => {
          const result = await signUp("new-user@example.com", "password", "New User");
          setSignUpStatus(result.info ?? (result.ok ? "ok" : `error:${result.error ?? "unknown"}`));
        }}
      >
        Sign Up
      </button>
      <button
        type="button"
        onClick={async () => {
          await signIn("demo@labelwise.app", "password");
        }}
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={async () => {
          try {
            await saveProfile(buildProfilePayload());
            setProfileStatus("ok");
          } catch (error) {
            setProfileStatus(`error:${error instanceof Error ? error.message : "unknown"}`);
          }
        }}
      >
        Save Profile
      </button>
      <button
        type="button"
        onClick={async () => {
          const result = await saveScan(buildScanPayload());
          setSaveStatus(result.ok ? "ok" : `error:${result.error ?? "unknown"}`);
        }}
      >
        Save Scan
      </button>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          setSignOutStatus("done");
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <AppStateProvider>
      <Harness />
    </AppStateProvider>,
  );
}

describe("supabase persistence flow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    supabaseMockState.current = null;
  });

  it("does not mark signup as authenticated before Supabase issues a session", async () => {
    const unconfirmedUser = {
      id: "user-2",
      email: "new-user@example.com",
      created_at: "2026-05-11T00:00:00.000Z",
      user_metadata: { display_name: "New User" },
    };
    supabaseMockState.current = createSupabaseMock({
      signUpResponse: {
        data: { user: unconfirmedUser, session: null },
        error: null,
      },
    });

    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => {
      expect(screen.getByText("auth:no")).toBeInTheDocument();
      expect(
        screen.getByText("signup:Account created. If email confirmation is enabled in Supabase, confirm your email and then log in."),
      ).toBeInTheDocument();
    });

    expect(supabaseMockState.current?.from).not.toHaveBeenCalled();
  });

  it("returns control to the UI when the remote save is still pending", async () => {
    const saveDeferred = createDeferred<{ error: { message: string } | null }>();
    supabaseMockState.current = createSupabaseMock({ scanUpsertPromise: saveDeferred.promise });

    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await screen.findByText("auth:yes");
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: "Save Scan" }));

    expect(screen.getByText("history:1")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(screen.getByText("save:ok")).toBeInTheDocument();
    vi.useRealTimers();

    await act(async () => {
      saveDeferred.resolve({ error: null });
      await saveDeferred.promise;
      await Promise.resolve();
    });

    expect(screen.getByText("save:ok")).toBeInTheDocument();
  });

  it("clears the authenticated session immediately while the remote sign-out finishes", async () => {
    const signOutDeferred = createDeferred<{ error: { message: string } | null }>();
    supabaseMockState.current = createSupabaseMock({ signOutPromise: signOutDeferred.promise });

    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await screen.findByText("auth:yes");

    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(screen.getByText("auth:no")).toBeInTheDocument();
    expect(screen.getByText("signout:idle")).toBeInTheDocument();

    await act(async () => {
      signOutDeferred.resolve({ error: null });
      await signOutDeferred.promise;
    });

    await waitFor(() => {
      expect(screen.getByText("auth:no")).toBeInTheDocument();
      expect(screen.getByText("signout:done")).toBeInTheDocument();
    });
  });

  it("waits for a pending remote profile save before finishing sign-out", async () => {
    const profileSaveDeferred = createDeferred<{ error: { message: string } | null }>();
    const signOutDeferred = createDeferred<{ error: { message: string } | null }>();
    supabaseMockState.current = createSupabaseMock({
      profileUpsertPromise: profileSaveDeferred.promise,
      signOutPromise: signOutDeferred.promise,
    });

    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await screen.findByText("auth:yes");

    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    expect(screen.getByText("profile-allergies:Milk")).toBeInTheDocument();
    expect(screen.getByText("profile-save:idle")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(screen.getByText("auth:no")).toBeInTheDocument();
    expect(screen.getByText("signout:idle")).toBeInTheDocument();

    await act(async () => {
      profileSaveDeferred.resolve({ error: null });
      await profileSaveDeferred.promise;
      await Promise.resolve();
    });

    await act(async () => {
      signOutDeferred.resolve({ error: null });
      await signOutDeferred.promise;
    });

    await waitFor(() => {
      expect(screen.getByText("profile-save:ok")).toBeInTheDocument();
      expect(screen.getByText("signout:done")).toBeInTheDocument();
    });
  });
});
