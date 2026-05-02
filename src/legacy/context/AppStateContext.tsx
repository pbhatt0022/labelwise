import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { getDefaultProfile, normalizeProfile } from "@/lib/analysis";
import type { ReflectionChoice, ReflectionEntry, ScanDraft, ScanFolder, ScanRecord, UserAccount, UserProfile } from "@/lib/types";

const ACCOUNTS_STORAGE_KEY = "food-scanner-accounts";
const PROFILES_STORAGE_KEY = "food-scanner-profiles";
const SCANS_STORAGE_KEY = "food-scanner-scans";
const FOLDERS_STORAGE_KEY = "food-scanner-folders";
const REFLECTIONS_STORAGE_KEY = "food-scanner-reflections";
const SESSION_STORAGE_KEY = "food-scanner-session";
const DRAFT_STORAGE_KEY = "food-scanner-draft";
const LEGACY_PROFILE_STORAGE_KEY = "food-scanner-profile";
const LEGACY_HISTORY_STORAGE_KEY = "food-scanner-history";

interface AppStateContextValue {
  currentUser?: UserAccount;
  isAuthenticated: boolean;
  profile: UserProfile;
  history: ScanRecord[];
  folders: ScanFolder[];
  reflections: ReflectionEntry[];
  selectedScanId?: string;
  draft: ScanDraft;
  signUp: (email: string, password: string, displayName?: string) => { ok: boolean; error?: string };
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
  saveProfile: (profile: UserProfile) => void;
  updateDraft: (nextDraft: Partial<ScanDraft>) => void;
  resetDraft: () => void;
  saveScan: (record: Omit<ScanRecord, "userId" | "isFavorite"> & Partial<Pick<ScanRecord, "isFavorite">>) => void;
  selectScan: (scanId?: string) => void;
  createFolder: (name: string, description?: string) => { ok: boolean; folderId?: string; error?: string };
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  moveScanToFolder: (scanId: string, folderId?: string) => void;
  toggleFavorite: (scanId: string) => void;
  updateScanNote: (scanId: string, note?: string) => void;
  saveReflection: (scanId: string, payload: { purchaseIntent?: ReflectionChoice; clarity?: ReflectionChoice }) => void;
  getReflection: (scanId: string) => ReflectionEntry | undefined;
}

const defaultDraft: ScanDraft = {
  productName: "",
  brandName: "",
  ingredientText: "",
  ocrStatus: "idle",
};

const defaultFolderNames = ["Safe Foods", "Grocery", "Review Later"];
const AppStateContext = createContext<AppStateContextValue | null>(null);

function createId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  if (typeof value === "undefined") {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getDefaultFolders(userId: string): ScanFolder[] {
  const now = new Date().toISOString();
  return defaultFolderNames.map((name) => ({
    id: createId("folder"),
    userId,
    name,
    createdAt: now,
    updatedAt: now,
  }));
}

function getDisplayNameFromEmail(email: string): string {
  return email.split("@")[0]?.replace(/[._-]+/g, " ")?.replace(/\b\w/g, (match) => match.toUpperCase()) || "Food Scanner User";
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => readStorage(ACCOUNTS_STORAGE_KEY, []));
  const [profilesByUser, setProfilesByUser] = useState<Record<string, UserProfile>>(() => readStorage(PROFILES_STORAGE_KEY, {}));
  const [scans, setScans] = useState<ScanRecord[]>(() => readStorage(SCANS_STORAGE_KEY, []));
  const [folders, setFolders] = useState<ScanFolder[]>(() => readStorage(FOLDERS_STORAGE_KEY, []));
  const [reflections, setReflections] = useState<ReflectionEntry[]>(() => readStorage(REFLECTIONS_STORAGE_KEY, []));
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(() => readStorage<string | undefined>(SESSION_STORAGE_KEY, undefined));
  const [selectedScanId, setSelectedScanId] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState<ScanDraft>(() => readStorage(DRAFT_STORAGE_KEY, defaultDraft));

  useEffect(() => persistStorage(ACCOUNTS_STORAGE_KEY, accounts), [accounts]);
  useEffect(() => persistStorage(PROFILES_STORAGE_KEY, profilesByUser), [profilesByUser]);
  useEffect(() => persistStorage(SCANS_STORAGE_KEY, scans), [scans]);
  useEffect(() => persistStorage(FOLDERS_STORAGE_KEY, folders), [folders]);
  useEffect(() => persistStorage(REFLECTIONS_STORAGE_KEY, reflections), [reflections]);
  useEffect(() => persistStorage(SESSION_STORAGE_KEY, currentUserId), [currentUserId]);
  useEffect(() => persistStorage(DRAFT_STORAGE_KEY, draft), [draft]);

  const currentUser = useMemo(() => accounts.find((account) => account.id === currentUserId), [accounts, currentUserId]);

  const profile = useMemo(() => {
    if (!currentUser) return normalizeProfile(getDefaultProfile());
    return normalizeProfile(profilesByUser[currentUser.id] ?? getDefaultProfile());
  }, [currentUser, profilesByUser]);

  const history = useMemo(
    () => (currentUser ? scans.filter((scan) => scan.userId === currentUser.id) : []),
    [currentUser, scans],
  );

  const userFolders = useMemo(
    () => (currentUser ? folders.filter((folder) => folder.userId === currentUser.id) : []),
    [currentUser, folders],
  );

  const userReflections = useMemo(
    () => (currentUser ? reflections.filter((reflection) => reflection.userId === currentUser.id) : []),
    [currentUser, reflections],
  );

  const ensureStarterFolders = (userId: string) => {
    setFolders((current) => {
      const existing = current.filter((folder) => folder.userId === userId);
      if (existing.length > 0) return current;
      return [...current, ...getDefaultFolders(userId)];
    });
  };

  const importLegacyDataForUser = (userId: string) => {
    const legacyHistory = readStorage<ScanRecord[]>(LEGACY_HISTORY_STORAGE_KEY, []);

    if (legacyHistory.length > 0) {
      setScans((current) => {
        const hasUserScans = current.some((scan) => scan.userId === userId);
        if (hasUserScans) return current;
        return [
          ...legacyHistory.map((scan) => ({
            ...scan,
            userId,
            isFavorite: scan.isFavorite ?? false,
          })),
          ...current,
        ];
      });
    }
  };

  const signUp = (email: string, password: string, displayName?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) return { ok: false, error: "Enter both an email and password." };
    if (accounts.some((account) => account.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: "An account with that email already exists." };
    }

    const legacyProfile = readStorage<UserProfile | undefined>(LEGACY_PROFILE_STORAGE_KEY, undefined);
    const nextUser: UserAccount = {
      id: createId("user"),
      email: normalizedEmail,
      password,
      displayName: displayName?.trim() || getDisplayNameFromEmail(normalizedEmail),
      createdAt: new Date().toISOString(),
    };

    setAccounts((current) => [...current, nextUser]);
    setProfilesByUser((current) => ({
      ...current,
      [nextUser.id]: normalizeProfile(legacyProfile ?? getDefaultProfile()),
    }));
    setCurrentUserId(nextUser.id);
    ensureStarterFolders(nextUser.id);
    importLegacyDataForUser(nextUser.id);
    return { ok: true };
  };

  const signIn = (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const account = accounts.find((item) => item.email.toLowerCase() === normalizedEmail);
    if (!account || account.password !== password) {
      return { ok: false, error: "We could not match that email and password." };
    }

    setCurrentUserId(account.id);
    ensureStarterFolders(account.id);
    return { ok: true };
  };

  const signOut = () => {
    setCurrentUserId(undefined);
    setSelectedScanId(undefined);
    setDraft(defaultDraft);
  };

  const value = useMemo<AppStateContextValue>(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      profile,
      history,
      folders: userFolders,
      reflections: userReflections,
      selectedScanId,
      draft,
      signUp,
      signIn,
      signOut,
      saveProfile: (nextProfile) => {
        if (!currentUser) return;
        setProfilesByUser((current) => ({ ...current, [currentUser.id]: normalizeProfile(nextProfile) }));
      },
      updateDraft: (nextDraft) => setDraft((current) => ({ ...current, ...nextDraft })),
      resetDraft: () => setDraft(defaultDraft),
      saveScan: (record) => {
        if (!currentUser) return;
        const nextRecord: ScanRecord = {
          ...record,
          userId: currentUser.id,
          isFavorite: record.isFavorite ?? false,
        };
        setScans((current) => [nextRecord, ...current.filter((item) => item.id !== nextRecord.id)]);
        setSelectedScanId(nextRecord.id);
      },
      selectScan: (scanId) => setSelectedScanId(scanId),
      createFolder: (name, description) => {
        if (!currentUser) return { ok: false, error: "Sign in to create folders." };
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, error: "Enter a folder name." };
        if (userFolders.some((folder) => folder.name.toLowerCase() === trimmed.toLowerCase())) {
          return { ok: false, error: "That folder already exists." };
        }

        const now = new Date().toISOString();
        const folderId = createId("folder");
        setFolders((current) => [
          {
            id: folderId,
            userId: currentUser.id,
            name: trimmed,
            description,
            createdAt: now,
            updatedAt: now,
          },
          ...current,
        ]);
        return { ok: true, folderId };
      },
      renameFolder: (folderId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setFolders((current) =>
          current.map((folder) =>
            folder.id === folderId ? { ...folder, name: trimmed, updatedAt: new Date().toISOString() } : folder,
          ),
        );
      },
      deleteFolder: (folderId) => {
        setFolders((current) => current.filter((folder) => folder.id !== folderId));
        setScans((current) => current.map((scan) => (scan.folderId === folderId ? { ...scan, folderId: undefined } : scan)));
      },
      moveScanToFolder: (scanId, folderId) => {
        setScans((current) => current.map((scan) => (scan.id === scanId ? { ...scan, folderId } : scan)));
      },
      toggleFavorite: (scanId) => {
        setScans((current) => current.map((scan) => (scan.id === scanId ? { ...scan, isFavorite: !scan.isFavorite } : scan)));
      },
      updateScanNote: (scanId, note) => {
        setScans((current) => current.map((scan) => (scan.id === scanId ? { ...scan, userNote: note?.trim() || undefined } : scan)));
      },
      saveReflection: (scanId, payload) => {
        if (!currentUser) return;
        setReflections((current) => {
          const existing = current.find((entry) => entry.scanId === scanId && entry.userId === currentUser.id);
          const timestamp = new Date().toISOString();
          if (existing) {
            return current.map((entry) =>
              entry.id === existing.id ? { ...entry, ...payload, updatedAt: timestamp } : entry,
            );
          }
          return [
            {
              id: createId("reflection"),
              userId: currentUser.id,
              scanId,
              ...payload,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            ...current,
          ];
        });
      },
      getReflection: (scanId) => userReflections.find((entry) => entry.scanId === scanId),
    }),
    [currentUser, draft, history, profile, reflections, scans, selectedScanId, userFolders, userReflections],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
}
