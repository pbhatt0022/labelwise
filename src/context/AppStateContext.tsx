import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { getDefaultProfile, normalizeProfile } from "@/lib/analysis";
import { applyScanFolderIds, getPrimaryScanFolderId, getScanFolderIds, scanHasFolder } from "@/lib/scanFolders";
import { isSupabaseConfigured, supabase, supabaseData } from "@/lib/supabase";
import type { DietCrossCheck, ReflectionChoice, ReflectionEntry, ScanDraft, ScanFolder, ScanRecord, StructuredExplanation, UserAccount, UserProfile } from "@/lib/types";

const ACCOUNTS_STORAGE_KEY = "food-scanner-accounts";
const PROFILES_STORAGE_KEY = "food-scanner-profiles";
const SCANS_STORAGE_KEY = "food-scanner-scans";
const FOLDERS_STORAGE_KEY = "food-scanner-folders";
const FOLDER_ORDER_STORAGE_KEY = "food-scanner-folder-order";
const REFLECTIONS_STORAGE_KEY = "food-scanner-reflections";
const SESSION_STORAGE_KEY = "food-scanner-session";
const DRAFT_STORAGE_KEY = "food-scanner-draft";
const LEGACY_PROFILE_STORAGE_KEY = "food-scanner-profile";
const LEGACY_HISTORY_STORAGE_KEY = "food-scanner-history";
const REMOTE_SCAN_SAVE_TIMEOUT_MS = 5000;
type ActionResult = { ok: boolean; error?: string; info?: string };

interface AppStateContextValue {
  currentUser?: UserAccount;
  isAuthenticated: boolean;
  isAuthResolved: boolean;
  isRemoteDataLoading: boolean;
  backendMode: "supabase" | "local";
  profile: UserProfile;
  history: ScanRecord[];
  folders: ScanFolder[];
  reflections: ReflectionEntry[];
  selectedScanId?: string;
  draft: ScanDraft;
  signUp: (email: string, password: string, displayName?: string) => Promise<ActionResult>;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  updateDraft: (nextDraft: Partial<ScanDraft>) => void;
  resetDraft: () => void;
  saveScan: (record: Omit<ScanRecord, "userId" | "isFavorite"> & Partial<Pick<ScanRecord, "isFavorite">>) => Promise<ActionResult>;
  selectScan: (scanId?: string) => void;
  deleteScan: (scanId: string) => Promise<void>;
  createFolder: (name: string, description?: string) => Promise<{ ok: boolean; folderId?: string; error?: string }>;
  renameFolder: (folderId: string, name: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  reorderFolder: (folderId: string, direction: "up" | "down") => Promise<void>;
  updateScanFolders: (scanId: string, folderIds: string[]) => Promise<void>;
  toggleFavorite: (scanId: string) => Promise<void>;
  updateScanExplanation: (scanId: string, explanation: StructuredExplanation) => Promise<void>;
  updateScanDietCrossChecks: (scanId: string, dietCrossChecks: DietCrossCheck[]) => Promise<void>;
  updateScanDetails: (scanId: string, payload: { productName?: string; brandName?: string }) => Promise<void>;
  updateScanNote: (scanId: string, note?: string) => Promise<void>;
  saveReflection: (scanId: string, payload: { purchaseIntent?: ReflectionChoice; clarity?: ReflectionChoice }) => Promise<void>;
  getReflection: (scanId: string) => ReflectionEntry | undefined;
}

interface LocalStoredAccount extends UserAccount {
  password: string;
}

const defaultDraft: ScanDraft = {
  productName: "",
  brandName: "",
  ingredientText: "",
  includeNutritionDetails: false,
  ocrStatus: "idle",
  ocrText: "",
  ocrError: "",
  nutritionOcrStatus: "idle",
  nutritionOcrText: "",
  nutritionOcrError: "",
};

const defaultFolderNames = ["Go-To Options", "Grocery", "Review Later"];
const AppStateContext = createContext<AppStateContextValue | null>(null);

function sanitizeDraftForSession(_draft: ScanDraft): ScanDraft {
  return { ...defaultDraft };
}

function sanitizeDraftForStorage(draft: ScanDraft): ScanDraft {
  const { imagePreviewUrl: _imagePreviewUrl, nutritionImagePreviewUrl: _nutritionImagePreviewUrl, ...persistedDraft } = draft;
  return persistedDraft;
}

function createUuidFallback(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function createId(_prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : createUuidFallback();
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
  try {
    if (typeof value === "undefined") {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not persist local storage key "${key}".`, error);
  }
}

function getDisplayNameFromEmail(email: string): string {
  return email.split("@")[0]?.replace(/[._-]+/g, " ")?.replace(/\b\w/g, (match) => match.toUpperCase()) || "LabelWise User";
}

function getDefaultFolders(userId: string): ScanFolder[] {
  const now = new Date().toISOString();
  return defaultFolderNames.map((name, index) => ({
    id: createId("folder"),
    userId,
    name,
    createdAt: now,
    updatedAt: now,
    sortIndex: index,
  }));
}

function orderFolders(folders: ScanFolder[], orderMap: Record<string, string[]>, userId?: string) {
  if (!userId) return folders;
  const savedOrder = orderMap[userId] ?? [];
  const rank = new Map(savedOrder.map((folderId, index) => [folderId, index]));

  return [...folders].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (typeof leftRank === "number" && typeof rightRank === "number") return leftRank - rightRank;
    if (typeof leftRank === "number") return -1;
    if (typeof rightRank === "number") return 1;
    if (typeof left.sortIndex === "number" && typeof right.sortIndex === "number") return left.sortIndex - right.sortIndex;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

function mapSupabaseUser(user: { id: string; email?: string | null; created_at?: string; user_metadata?: Record<string, unknown> }): UserAccount {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
        ? user.user_metadata.display_name
        : getDisplayNameFromEmail(user.email ?? ""),
    createdAt: user.created_at ?? new Date().toISOString(),
    authProvider: "supabase",
  };
}

function toFolderRow(folder: ScanFolder) {
  return {
    id: folder.id,
    user_id: folder.userId,
    name: folder.name,
    description: folder.description ?? null,
    sort_index: folder.sortIndex ?? null,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
  };
}

function fromFolderRow(row: Record<string, unknown>): ScanFolder {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : undefined,
    sortIndex: typeof row.sort_index === "number" ? row.sort_index : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toScanRow(scan: ScanRecord) {
  const analysis = {
    ...scan.analysis,
    nutritionFacts: scan.nutritionFacts ?? scan.analysis.nutritionFacts,
  };

  return {
    id: scan.id,
    user_id: scan.userId,
    product_name: scan.productName,
    brand_name: scan.brandName ?? null,
    ingredient_text: scan.ingredientText,
    image_name: scan.imageName ?? null,
    created_at: scan.createdAt,
    ocr_text: scan.ocrText ?? null,
    ocr_confidence: scan.ocrConfidence ?? null,
    ocr_source: scan.ocrSource ?? null,
    ocr_status_at_save: scan.ocrStatusAtSave ?? null,
    analysis,
    profile_snapshot: scan.profileSnapshot,
    folder_id: getPrimaryScanFolderId(scan) ?? null,
    folder_ids: getScanFolderIds(scan),
    is_favorite: scan.isFavorite,
    user_note: scan.userNote ?? null,
  };
}

function fromScanRow(row: Record<string, unknown>): ScanRecord {
  const analysis = row.analysis as ScanRecord["analysis"];
  const legacyFolderId = typeof row.folder_id === "string" ? row.folder_id : undefined;
  const folderIds = Array.isArray(row.folder_ids) ? row.folder_ids.filter((value): value is string => typeof value === "string") : [];

  return {
    id: String(row.id),
    userId: String(row.user_id),
    productName: String(row.product_name),
    brandName: typeof row.brand_name === "string" ? row.brand_name : undefined,
    ingredientText: String(row.ingredient_text),
    nutritionFacts: analysis?.nutritionFacts,
    imageName: typeof row.image_name === "string" ? row.image_name : undefined,
    createdAt: String(row.created_at),
    ocrText: typeof row.ocr_text === "string" ? row.ocr_text : undefined,
    ocrConfidence: typeof row.ocr_confidence === "number" ? row.ocr_confidence : undefined,
    ocrSource: row.ocr_source === "camera" || row.ocr_source === "upload" ? row.ocr_source : undefined,
    ocrStatusAtSave:
      row.ocr_status_at_save === "idle" ||
      row.ocr_status_at_save === "extracting" ||
      row.ocr_status_at_save === "success" ||
      row.ocr_status_at_save === "error"
        ? row.ocr_status_at_save
        : undefined,
    analysis,
    profileSnapshot: normalizeProfile(row.profile_snapshot as UserProfile),
    ...applyScanFolderIds({ folderId: legacyFolderId, folderIds }, folderIds.length > 0 ? folderIds : legacyFolderId ? [legacyFolderId] : []),
    isFavorite: Boolean(row.is_favorite),
    userNote: typeof row.user_note === "string" ? row.user_note : undefined,
  };
}

function toReflectionRow(entry: ReflectionEntry) {
  return {
    id: entry.id,
    user_id: entry.userId,
    scan_id: entry.scanId,
    purchase_intent: entry.purchaseIntent ?? null,
    clarity: entry.clarity ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

function fromReflectionRow(row: Record<string, unknown>): ReflectionEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    scanId: String(row.scan_id),
    purchaseIntent: row.purchase_intent === "yes" || row.purchase_intent === "maybe" || row.purchase_intent === "no" ? row.purchase_intent : undefined,
    clarity: row.clarity === "yes" || row.clarity === "maybe" || row.clarity === "no" ? row.clarity : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [accounts, setAccounts] = useState<LocalStoredAccount[]>(() => readStorage(ACCOUNTS_STORAGE_KEY, []));
  const [profilesByUser, setProfilesByUser] = useState<Record<string, UserProfile>>(() => readStorage(PROFILES_STORAGE_KEY, {}));
  const [scans, setScans] = useState<ScanRecord[]>(() => readStorage(SCANS_STORAGE_KEY, []));
  const [folders, setFolders] = useState<ScanFolder[]>(() => readStorage(FOLDERS_STORAGE_KEY, []));
  const [folderOrderByUser, setFolderOrderByUser] = useState<Record<string, string[]>>(() => readStorage(FOLDER_ORDER_STORAGE_KEY, {}));
  const [reflections, setReflections] = useState<ReflectionEntry[]>(() => readStorage(REFLECTIONS_STORAGE_KEY, []));
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(() => readStorage<string | undefined>(SESSION_STORAGE_KEY, undefined));
  const [supabaseUser, setSupabaseUser] = useState<UserAccount | undefined>(undefined);
  const [isAuthResolved, setIsAuthResolved] = useState(!(isSupabaseConfigured && Boolean(supabase)));
  const [isRemoteDataLoading, setIsRemoteDataLoading] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState<ScanDraft>(() => sanitizeDraftForSession(readStorage(DRAFT_STORAGE_KEY, defaultDraft)));
  const pendingRemoteScanSavesRef = useRef(new Set<Promise<{ error: { message: string } | null }>>());
  const pendingRemoteProfileSavesRef = useRef(new Set<Promise<{ error: { message: string } | null }>>());

  useEffect(() => persistStorage(ACCOUNTS_STORAGE_KEY, accounts), [accounts]);
  useEffect(() => persistStorage(PROFILES_STORAGE_KEY, profilesByUser), [profilesByUser]);
  useEffect(() => persistStorage(SCANS_STORAGE_KEY, scans), [scans]);
  useEffect(() => persistStorage(FOLDERS_STORAGE_KEY, folders), [folders]);
  useEffect(() => persistStorage(FOLDER_ORDER_STORAGE_KEY, folderOrderByUser), [folderOrderByUser]);
  useEffect(() => persistStorage(REFLECTIONS_STORAGE_KEY, reflections), [reflections]);
  useEffect(() => persistStorage(SESSION_STORAGE_KEY, currentUserId), [currentUserId]);
  useEffect(() => persistStorage(DRAFT_STORAGE_KEY, sanitizeDraftForStorage(draft)), [draft]);

  const remoteDb = supabaseData ?? supabase;
  const backendMode = isSupabaseConfigured && supabase && remoteDb ? "supabase" : "local";
  const localCurrentUser = useMemo<UserAccount | undefined>(() => {
    const account = accounts.find((item) => item.id === currentUserId);
    if (!account) return undefined;
    const { password: _password, ...user } = account;
    return user;
  }, [accounts, currentUserId]);
  const currentUser = backendMode === "supabase" ? supabaseUser : localCurrentUser;

  const profile = useMemo(() => {
    if (!currentUser) return normalizeProfile(getDefaultProfile());
    return normalizeProfile(profilesByUser[currentUser.id] ?? getDefaultProfile());
  }, [currentUser, profilesByUser]);

  const history = useMemo(() => (currentUser ? scans.filter((scan) => scan.userId === currentUser.id) : []), [currentUser, scans]);
  const userFolders = useMemo(
    () => (currentUser ? orderFolders(folders.filter((folder) => folder.userId === currentUser.id), folderOrderByUser, currentUser.id) : []),
    [currentUser, folders, folderOrderByUser],
  );
  const userReflections = useMemo(() => (currentUser ? reflections.filter((reflection) => reflection.userId === currentUser.id) : []), [currentUser, reflections]);

  const ensureStarterFoldersLocal = (userId: string) => {
    const starterFolders = getDefaultFolders(userId);
    setFolders((current) => {
      const existing = current.filter((folder) => folder.userId === userId);
      if (existing.length > 0) return current;
      return [...current, ...starterFolders];
    });
    setFolderOrderByUser((current) => {
      if (current[userId]?.length) return current;
      return { ...current, [userId]: starterFolders.map((folder) => folder.id) };
    });
  };

  const ensureStarterFoldersRemote = async (userId: string) => {
    if (!remoteDb) return;
    const { data, error } = await remoteDb.from("scan_folders").select("id").eq("user_id", userId).limit(1);
    if (error || (data ?? []).length > 0) return;
    const starterFolders = getDefaultFolders(userId);
    await remoteDb.from("scan_folders").insert(starterFolders.map(toFolderRow));
    setFolderOrderByUser((current) => ({ ...current, [userId]: starterFolders.map((folder) => folder.id) }));
  };

  const importLegacyDataLocal = (userId: string) => {
    const legacyHistory = readStorage<ScanRecord[]>(LEGACY_HISTORY_STORAGE_KEY, []);
    if (legacyHistory.length === 0) return;
    setScans((current) => {
      const hasUserScans = current.some((scan) => scan.userId === userId);
      if (hasUserScans) return current;
      return legacyHistory.map((scan) => ({ ...scan, userId, isFavorite: scan.isFavorite ?? false })).concat(current);
    });
  };

  const importLegacyDataRemote = async (user: UserAccount) => {
    if (!remoteDb) return;
    const legacyProfile = readStorage<UserProfile | undefined>(LEGACY_PROFILE_STORAGE_KEY, undefined);
    const legacyHistory = readStorage<ScanRecord[]>(LEGACY_HISTORY_STORAGE_KEY, []);

    const { data: existingProfile } = await remoteDb.from("user_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!existingProfile) {
      await remoteDb.from("user_profiles").upsert({
        user_id: user.id,
        email: user.email,
        display_name: user.displayName,
        preferences: normalizeProfile(legacyProfile ?? getDefaultProfile()),
        created_at: user.createdAt,
        updated_at: new Date().toISOString(),
      });
    }

    const { data: existingScans } = await remoteDb.from("scan_records").select("id").eq("user_id", user.id).limit(1);
    if ((existingScans ?? []).length === 0 && legacyHistory.length > 0) {
      await remoteDb.from("scan_records").upsert(
        legacyHistory.map((scan) => toScanRow({ ...scan, userId: user.id, isFavorite: scan.isFavorite ?? false })),
      );
    }
  };

  const loadRemoteData = async (user: UserAccount) => {
    if (!remoteDb) return;
    try {
      await ensureStarterFoldersRemote(user.id);
    } catch (err) {
      console.error("[LabelWise] ensureStarterFoldersRemote threw:", err);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] | null = await Promise.all([
      remoteDb.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      remoteDb.from("scan_folders").select("*").eq("user_id", user.id).order("sort_index", { ascending: true }).order("created_at", { ascending: true }),
      remoteDb.from("scan_records").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      remoteDb.from("reflection_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]).catch((err) => {
      console.error("[LabelWise] loadRemoteData threw:", err);
      return null;
    });

    if (!results) return;

    const [profileResult, foldersResult, scansResult, reflectionsResult] = results;

    if (profileResult.error || foldersResult.error || scansResult.error || reflectionsResult.error) {
      console.error("[LabelWise] loadRemoteData query errors:", { profileResult, foldersResult, scansResult, reflectionsResult });
      return;
    }

    if (profileResult.data) {
      setProfilesByUser((current) => ({
        ...current,
        [user.id]: normalizeProfile((profileResult.data.preferences as UserProfile) ?? getDefaultProfile()),
      }));
    } else {
      setProfilesByUser((current) => ({ ...current, [user.id]: normalizeProfile(getDefaultProfile()) }));
    }

    setFolders((current) => current.filter((folder) => folder.userId !== user.id).concat((foldersResult.data ?? []).map((row) => fromFolderRow(row as Record<string, unknown>))));
    setFolderOrderByUser((current) => ({
      ...current,
      [user.id]: orderFolders((foldersResult.data ?? []).map((row) => fromFolderRow(row as Record<string, unknown>)), current, user.id).map((folder) => folder.id),
    }));
    setScans((current) => current.filter((scan) => scan.userId !== user.id).concat((scansResult.data ?? []).map((row) => fromScanRow(row as Record<string, unknown>))));
    setReflections((current) => current.filter((entry) => entry.userId !== user.id).concat((reflectionsResult.data ?? []).map((row) => fromReflectionRow(row as Record<string, unknown>))));
  };

  useEffect(() => {
    if (!supabase || !remoteDb || !isSupabaseConfigured) return;

    let active = true;
    setIsAuthResolved(false);
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        setIsRemoteDataLoading(true);
        const user = mapSupabaseUser(data.session.user);
        setSupabaseUser(user);
        await importLegacyDataRemote(user);
        await loadRemoteData(user);
        if (!active) return;
        setIsRemoteDataLoading(false);
      } else {
        setSupabaseUser(undefined);
        setIsRemoteDataLoading(false);
      }
      setIsAuthResolved(true);
    }).catch((error) => {
      console.error("[LabelWise] initial auth restore failed:", error);
      if (!active) return;
      setSupabaseUser(undefined);
      setIsRemoteDataLoading(false);
      setIsAuthResolved(true);
    });

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsRemoteDataLoading(true);
        const user = mapSupabaseUser(session.user);
        setSupabaseUser(user);
        await importLegacyDataRemote(user);
        await loadRemoteData(user);
        if (!active) return;
        setIsRemoteDataLoading(false);
      } else {
        setSupabaseUser(undefined);
        setIsRemoteDataLoading(false);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string): Promise<ActionResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const nextDisplayName = displayName?.trim() || getDisplayNameFromEmail(normalizedEmail);
    if (!normalizedEmail || !password.trim()) return { ok: false, error: "Enter both an email and password." };

    if (backendMode === "supabase" && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { display_name: nextDisplayName } },
      });
      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: "We could not create that account." };
      if (!data.session) {
        // Supabase can create the user before issuing a browser session when email confirmation is enabled.
        // In that state, the user should confirm their email and explicitly log in before we treat them as authenticated.
        setSupabaseUser(undefined);
        return { ok: true, info: "Account created. If email confirmation is enabled in Supabase, confirm your email and then log in." };
      }

      const user = mapSupabaseUser({ ...data.user, user_metadata: { ...data.user.user_metadata, display_name: nextDisplayName } });
      setIsRemoteDataLoading(true);
      setSupabaseUser(user);
      try {
        await ensureStarterFoldersRemote(user.id);
        await remoteDb.from("user_profiles").upsert({
          user_id: user.id,
          email: user.email,
          display_name: user.displayName,
          preferences: normalizeProfile(readStorage<UserProfile | undefined>(LEGACY_PROFILE_STORAGE_KEY, undefined) ?? getDefaultProfile()),
          created_at: user.createdAt,
          updated_at: new Date().toISOString(),
        });
        await importLegacyDataRemote(user);
        await loadRemoteData(user);
        return { ok: true };
      } finally {
        setIsRemoteDataLoading(false);
      }
    }

    if (accounts.some((account) => account.email.toLowerCase() === normalizedEmail)) return { ok: false, error: "An account with that email already exists." };

    const legacyProfile = readStorage<UserProfile | undefined>(LEGACY_PROFILE_STORAGE_KEY, undefined);
    const nextUser: LocalStoredAccount = {
      id: createId("user"),
      email: normalizedEmail,
      password,
      displayName: nextDisplayName,
      createdAt: new Date().toISOString(),
      authProvider: "local",
    };
    setAccounts((current) => [...current, nextUser]);
    setProfilesByUser((current) => ({ ...current, [nextUser.id]: normalizeProfile(legacyProfile ?? getDefaultProfile()) }));
    setCurrentUserId(nextUser.id);
    ensureStarterFoldersLocal(nextUser.id);
    importLegacyDataLocal(nextUser.id);
    return { ok: true };
  };

  const signIn = async (email: string, password: string): Promise<ActionResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (backendMode === "supabase" && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: "We could not match that email and password." };
      const user = mapSupabaseUser(data.user);
      setIsRemoteDataLoading(true);
      setSupabaseUser(user);
      try {
        await loadRemoteData(user);
        return { ok: true };
      } finally {
        setIsRemoteDataLoading(false);
      }
    }

    const account = accounts.find((item) => item.email.toLowerCase() === normalizedEmail);
    if (!account || account.password !== password) return { ok: false, error: "We could not match that email and password." };
    setCurrentUserId(account.id);
    ensureStarterFoldersLocal(account.id);
    return { ok: true };
  };

  const signOut = async () => {
    if (backendMode === "supabase" && supabase) {
      const pendingRemoteScanSaves = Array.from(pendingRemoteScanSavesRef.current);
      const pendingRemoteProfileSaves = Array.from(pendingRemoteProfileSavesRef.current);
      setIsRemoteDataLoading(false);
      setSupabaseUser(undefined);
      await Promise.allSettled([...pendingRemoteScanSaves, ...pendingRemoteProfileSaves]);
      await supabase.auth.signOut().catch((error) => {
        console.error("Supabase sign out failed, clearing the local session anyway.", error);
      });
      setScans([]);
      setFolders([]);
      setReflections([]);
      setProfilesByUser({});
      setFolderOrderByUser({});
      [SCANS_STORAGE_KEY, FOLDERS_STORAGE_KEY, REFLECTIONS_STORAGE_KEY,
       PROFILES_STORAGE_KEY, FOLDER_ORDER_STORAGE_KEY, DRAFT_STORAGE_KEY,
       SESSION_STORAGE_KEY].forEach((key) => window.localStorage.removeItem(key));
      // Then tell Supabase — fire and forget, local state is already cleared
      setSupabaseUser(undefined);
    } else {
      // Local mode: only clear session and draft — wiping data would destroy it permanently
      setCurrentUserId(undefined);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
    setSelectedScanId(undefined);
    setDraft(defaultDraft);
  };

  const saveProfile = async (nextProfile: UserProfile) => {
    if (!currentUser) return;
    const normalized = normalizeProfile(nextProfile);
    const previousProfile = normalizeProfile(profilesByUser[currentUser.id] ?? getDefaultProfile());
    setProfilesByUser((current) => ({ ...current, [currentUser.id]: normalized }));
    if (backendMode === "supabase" && remoteDb) {
      const remoteSavePromise = Promise.resolve(
        remoteDb.from("user_profiles").upsert({
          user_id: currentUser.id,
          email: currentUser.email,
          display_name: currentUser.displayName,
          preferences: normalized,
          created_at: currentUser.createdAt,
          updated_at: new Date().toISOString(),
        }),
      );
      pendingRemoteProfileSavesRef.current.add(remoteSavePromise);
      void remoteSavePromise.finally(() => {
        pendingRemoteProfileSavesRef.current.delete(remoteSavePromise);
      });

      try {
        const { error } = await remoteSavePromise;
        if (error) {
          setProfilesByUser((current) => ({ ...current, [currentUser.id]: previousProfile }));
          throw new Error(error.message);
        }
      } catch (error) {
        setProfilesByUser((current) => ({ ...current, [currentUser.id]: previousProfile }));
        console.error("Remote profile save failed after the local profile was already stored.", error);
        throw error instanceof Error ? error : new Error("We could not save your profile to your account.");
      }
    }
  };

  const saveScan = async (record: Omit<ScanRecord, "userId" | "isFavorite"> & Partial<Pick<ScanRecord, "isFavorite">>): Promise<ActionResult> => {
    if (!currentUser) return { ok: false, error: "Sign in to save scans." };
    const nextRecord: ScanRecord = applyScanFolderIds(
      { ...record, userId: currentUser.id, isFavorite: record.isFavorite ?? false },
      record.folderIds ?? (record.folderId ? [record.folderId] : []),
    );
    setScans((current) => [nextRecord, ...current.filter((item) => item.id !== nextRecord.id)]);
    setSelectedScanId(nextRecord.id);
    if (backendMode === "supabase" && remoteDb) {
      try {
        const remoteSavePromise = (async () => {
          const { error } = await remoteDb
            .from("scan_records")
            .upsert(toScanRow(nextRecord))
            .select("id");
          if (error) {
            console.error("[LabelWise] remote save failed:", nextRecord.id, error);
          }
          return { error };
        })();
        pendingRemoteScanSavesRef.current.add(remoteSavePromise);
        void remoteSavePromise.finally(() => {
          pendingRemoteScanSavesRef.current.delete(remoteSavePromise);
        });

        const remoteSaveResult = await Promise.race([
          remoteSavePromise.then(({ error }) => ({ timedOut: false as const, error })),
          new Promise<{ timedOut: true }>((resolve) => {
            window.setTimeout(() => resolve({ timedOut: true }), REMOTE_SCAN_SAVE_TIMEOUT_MS);
          }),
        ]);

        if (remoteSaveResult.timedOut) {
          console.warn("[LabelWise] remote save timed out for", nextRecord.id);
          return { ok: true, info: "Saved locally. Cloud sync may take a little longer." };
        }

        if (remoteSaveResult.error) {
          setScans((current) => current.filter((item) => item.id !== nextRecord.id));
          setSelectedScanId((current) => (current === nextRecord.id ? undefined : current));
          return { ok: false, error: remoteSaveResult.error.message };
        }
      } catch (error) {
        console.error("Remote scan save failed after the local scan was already stored.", error);
        setScans((current) => current.filter((item) => item.id !== nextRecord.id));
        setSelectedScanId((current) => (current === nextRecord.id ? undefined : current));
        return { ok: false, error: error instanceof Error ? error.message : "We could not save this scan to your account." };
      }
    }
    return { ok: true };
  };

  const deleteScan = async (scanId: string) => {
    setScans((current) => current.filter((scan) => scan.id !== scanId));
    setReflections((current) => current.filter((entry) => entry.scanId !== scanId));
    setSelectedScanId((current) => (current === scanId ? undefined : current));

    if (backendMode === "supabase" && remoteDb) {
      await remoteDb.from("reflection_entries").delete().eq("scan_id", scanId);
      await remoteDb.from("scan_records").delete().eq("id", scanId);
    }
  };

  const createFolder = async (name: string, description?: string) => {
    if (!currentUser) return { ok: false, error: "Sign in to create folders." };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Enter a folder name." };
    if (userFolders.some((folder) => folder.name.toLowerCase() === trimmed.toLowerCase())) return { ok: false, error: "That folder already exists." };

    const now = new Date().toISOString();
    const folder: ScanFolder = {
      id: createId("folder"),
      userId: currentUser.id,
      name: trimmed,
      description,
      createdAt: now,
      updatedAt: now,
      sortIndex: userFolders.length,
    };
    setFolders((current) => [folder, ...current]);
    setFolderOrderByUser((current) => ({
      ...current,
      [currentUser.id]: [...(current[currentUser.id] ?? userFolders.map((entry) => entry.id)), folder.id],
    }));
    if (backendMode === "supabase" && remoteDb) {
      const { error } = await remoteDb.from("scan_folders").insert(toFolderRow(folder));
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true, folderId: folder.id };
  };

  const renameFolder = async (folderId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updatedAt = new Date().toISOString();
    setFolders((current) => current.map((folder) => (folder.id === folderId ? { ...folder, name: trimmed, updatedAt } : folder)));
    if (backendMode === "supabase" && remoteDb) {
      await remoteDb.from("scan_folders").update({ name: trimmed, updated_at: updatedAt }).eq("id", folderId);
    }
  };

  const deleteFolder = async (folderId: string) => {
    setFolders((current) => current.filter((folder) => folder.id !== folderId));
    if (currentUser) {
      setFolderOrderByUser((current) => ({
        ...current,
        [currentUser.id]: (current[currentUser.id] ?? []).filter((id) => id !== folderId),
      }));
    }
    const affectedScans = history.filter((scan) => scanHasFolder(scan, folderId));
    setScans((current) =>
      current.map((scan) => (scanHasFolder(scan, folderId) ? applyScanFolderIds(scan, getScanFolderIds(scan).filter((id) => id !== folderId)) : scan)),
    );
    if (backendMode === "supabase" && remoteDb) {
      await Promise.all(
        affectedScans.map((scan) => {
          const nextFolderIds = getScanFolderIds(scan).filter((id) => id !== folderId);
          return remoteDb.from("scan_records").update({ folder_id: nextFolderIds[0] ?? null, folder_ids: nextFolderIds }).eq("id", scan.id);
        }),
      );
      await remoteDb.from("scan_folders").delete().eq("id", folderId);
    }
  };

  const reorderFolder = async (folderId: string, direction: "up" | "down") => {
    if (!currentUser) return;
    const currentOrder = folderOrderByUser[currentUser.id] ?? userFolders.map((folder) => folder.id);
    const index = currentOrder.indexOf(folderId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const nextOrder = [...currentOrder];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(targetIndex, 0, moved);

    setFolderOrderByUser((current) => ({ ...current, [currentUser.id]: nextOrder }));
    const updatedFolders = folders
      .filter((folder) => folder.userId === currentUser.id)
      .map((folder) => {
        const nextIndex = nextOrder.indexOf(folder.id);
        return nextIndex === -1 ? folder : { ...folder, sortIndex: nextIndex };
      });

    setFolders((current) =>
      current.map((folder) => {
        if (folder.userId !== currentUser.id) return folder;
        return updatedFolders.find((candidate) => candidate.id === folder.id) ?? folder;
      }),
    );

    if (backendMode === "supabase" && remoteDb) {
      await Promise.all(
        updatedFolders.map((folder) =>
          remoteDb.from("scan_folders").update({ sort_index: folder.sortIndex ?? null, updated_at: new Date().toISOString() }).eq("id", folder.id),
        ),
      );
    }
  };

  const updateScanFolders = async (scanId: string, folderIds: string[]) => {
    const normalizedFolderIds = Array.from(new Set(folderIds.map((folderId) => folderId.trim()).filter((folderId) => folderId.length > 0)));
    setScans((current) => current.map((scan) => (scan.id === scanId ? applyScanFolderIds(scan, normalizedFolderIds) : scan)));
    if (backendMode === "supabase" && remoteDb) {
      await remoteDb.from("scan_records").update({ folder_id: normalizedFolderIds[0] ?? null, folder_ids: normalizedFolderIds }).eq("id", scanId);
    }
  };

  const toggleFavorite = async (scanId: string) => {
    const scan = history.find((item) => item.id === scanId);
    if (!scan) return;
    const nextFavorite = !scan.isFavorite;
    setScans((current) => current.map((item) => (item.id === scanId ? { ...item, isFavorite: nextFavorite } : item)));
    if (backendMode === "supabase" && remoteDb) {
      await remoteDb.from("scan_records").update({ is_favorite: nextFavorite }).eq("id", scanId);
    }
  };

  const updateScanExplanation = async (scanId: string, explanation: StructuredExplanation) => {
    const existingScan = history.find((item) => item.id === scanId);
    if (!existingScan) return;

    const nextScan: ScanRecord = {
      ...existingScan,
      analysis: {
        ...existingScan.analysis,
        explanation,
      },
    };

    setScans((current) => current.map((scan) => (scan.id === scanId ? nextScan : scan)));

    if (backendMode === "supabase" && remoteDb) {
      await remoteDb
        .from("scan_records")
        .update({
          analysis: {
            ...nextScan.analysis,
            nutritionFacts: nextScan.nutritionFacts ?? nextScan.analysis.nutritionFacts,
          },
        })
        .eq("id", scanId);
    }
  };

  const updateScanDietCrossChecks = async (scanId: string, dietCrossChecks: DietCrossCheck[]) => {
    const existingScan = history.find((item) => item.id === scanId);
    if (!existingScan) return;

    const nextScan: ScanRecord = {
      ...existingScan,
      analysis: {
        ...existingScan.analysis,
        dietCrossChecks,
      },
    };

    setScans((current) => current.map((scan) => (scan.id === scanId ? nextScan : scan)));

    if (backendMode === "supabase" && remoteDb) {
      await remoteDb
        .from("scan_records")
        .update({
          analysis: {
            ...nextScan.analysis,
            nutritionFacts: nextScan.nutritionFacts ?? nextScan.analysis.nutritionFacts,
          },
        })
        .eq("id", scanId);
    }
  };

  const updateScanDetails = async (scanId: string, payload: { productName?: string; brandName?: string }) => {
    const nextProductName = payload.productName?.trim();
    const nextBrandName = payload.brandName?.trim();

    setScans((current) =>
      current.map((scan) =>
        scan.id === scanId
          ? {
              ...scan,
              productName: nextProductName && nextProductName.length > 0 ? nextProductName : scan.productName,
              brandName: typeof payload.brandName === "undefined" ? scan.brandName : nextBrandName || undefined,
            }
          : scan,
      ),
    );

    if (backendMode === "supabase" && remoteDb) {
      const updatePayload: Record<string, string | null> = {};
      if (nextProductName && nextProductName.length > 0) updatePayload.product_name = nextProductName;
      if (typeof payload.brandName !== "undefined") updatePayload.brand_name = nextBrandName || null;
      if (Object.keys(updatePayload).length > 0) {
        await remoteDb.from("scan_records").update(updatePayload).eq("id", scanId);
      }
    }
  };

  const updateScanNote = async (scanId: string, note?: string) => {
    const nextNote = note?.trim() || undefined;
    setScans((current) => current.map((scan) => (scan.id === scanId ? { ...scan, userNote: nextNote } : scan)));
    if (backendMode === "supabase" && remoteDb) {
      await remoteDb.from("scan_records").update({ user_note: nextNote ?? null }).eq("id", scanId);
    }
  };

  const saveReflection = async (scanId: string, payload: { purchaseIntent?: ReflectionChoice; clarity?: ReflectionChoice }) => {
    if (!currentUser) return;
    const existing = userReflections.find((entry) => entry.scanId === scanId);
    const timestamp = new Date().toISOString();
    const nextEntry: ReflectionEntry = existing
      ? { ...existing, ...payload, updatedAt: timestamp }
      : { id: createId("reflection"), userId: currentUser.id, scanId, ...payload, createdAt: timestamp, updatedAt: timestamp };
    setReflections((current) => (existing ? current.map((entry) => (entry.id === existing.id ? nextEntry : entry)) : [nextEntry, ...current]));
    if (backendMode === "supabase" && remoteDb) {
      await remoteDb.from("reflection_entries").upsert(toReflectionRow(nextEntry));
    }
  };

  const value = useMemo<AppStateContextValue>(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isAuthResolved,
      isRemoteDataLoading,
      backendMode,
      profile,
      history,
      folders: userFolders,
      reflections: userReflections,
      selectedScanId,
      draft,
      signUp,
      signIn,
      signOut,
      saveProfile,
      updateDraft: (nextDraft) => setDraft((current) => ({ ...current, ...nextDraft })),
      resetDraft: () => setDraft(defaultDraft),
      saveScan,
      selectScan: (scanId) => setSelectedScanId(scanId),
      deleteScan,
      createFolder,
      renameFolder,
      deleteFolder,
      reorderFolder,
      updateScanFolders,
      toggleFavorite,
      updateScanExplanation,
      updateScanDietCrossChecks,
      updateScanDetails,
      updateScanNote,
      saveReflection,
      getReflection: (scanId) => userReflections.find((entry) => entry.scanId === scanId),
    }),
    [backendMode, currentUser, draft, history, isAuthResolved, isRemoteDataLoading, profile, selectedScanId, userFolders, userReflections],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
}
