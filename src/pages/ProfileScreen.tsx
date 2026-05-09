import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ProfileSummary from "@/components/ProfileSummary";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/context/AppStateContext";
import { ChevronRight, EllipsisVertical, FolderHeart, LogOut, Mail, MoveDown, MoveUp, Shield, SlidersHorizontal } from "lucide-react";

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { currentUser, profile, folders, history, renameFolder, deleteFolder, reorderFolder, saveProfile, signOut } = useAppState();
  const [editingFolderId, setEditingFolderId] = useState<string | undefined>(undefined);
  const [menuFolderId, setMenuFolderId] = useState<string | undefined>(undefined);
  const [folderName, setFolderName] = useState("");
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [editingNutritionPrefs, setEditingNutritionPrefs] = useState(false);
  const [dailySugarPreference, setDailySugarPreference] = useState(profile.dailySugarPreferenceG?.toString() ?? "");
  const [dailySodiumPreference, setDailySodiumPreference] = useState(profile.dailySodiumPreferenceMg?.toString() ?? "");
  const [dailySaturatedFatPreference, setDailySaturatedFatPreference] = useState(profile.dailySaturatedFatPreferenceG?.toString() ?? "");

  const parseOptionalNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const hasNutritionPrefs =
    profile.dailySugarPreferenceG !== undefined ||
    profile.dailySodiumPreferenceMg !== undefined ||
    profile.dailySaturatedFatPreferenceG !== undefined;

  const nutritionPrefItems = [
    profile.dailySugarPreferenceG !== undefined && { label: "Sugar", value: `${profile.dailySugarPreferenceG}g/day` },
    profile.dailySodiumPreferenceMg !== undefined && { label: "Sodium", value: `${profile.dailySodiumPreferenceMg}mg/day` },
    profile.dailySaturatedFatPreferenceG !== undefined && { label: "Saturated fat", value: `${profile.dailySaturatedFatPreferenceG}g/day` },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="bg-primary px-[24px] pb-[48px] pt-[56px] rounded-b-3xl">
        <div className="flex items-center gap-[16px]">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent/20 shrink-0">
            <SlidersHorizontal size={22} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">{currentUser?.displayName || "Profile"}</h1>
            <p className="text-sm text-primary-foreground/55">Settings, preferences, and account</p>
          </div>
        </div>
      </div>

      <div className="px-[24px] -mt-[28px] space-y-[12px]">
        <div className="rounded-2xl bg-card p-[18px] shadow-card">
          <div className="flex items-center gap-[10px]">
            <Mail size={15} className="text-muted-foreground shrink-0" />
            <p className="text-sm text-foreground">{currentUser?.email}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-[18px] shadow-card">
          <div className="mb-[14px] flex items-center justify-between gap-[12px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active preferences</p>
              <p className="mt-[4px] text-sm text-muted-foreground">Controls what gets flagged in every scan.</p>
            </div>
            <button onClick={() => navigate("/profile-setup")} className="text-sm font-medium text-primary shrink-0">
              Edit
            </button>
          </div>
          <ProfileSummary profile={profile} />
        </div>

        <div className="rounded-2xl bg-card p-[18px] shadow-card">
          <div className="mb-[14px] flex items-center justify-between gap-[12px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Daily targets</p>
              <p className="mt-[4px] text-sm text-muted-foreground">Personal comparison points for sugar, sodium, and saturated fat.</p>
            </div>
            {!editingNutritionPrefs && (
              <button
                onClick={() => setEditingNutritionPrefs(true)}
                className="text-sm font-medium text-primary shrink-0"
              >
                {hasNutritionPrefs ? "Edit" : "Set up"}
              </button>
            )}
          </div>

          {editingNutritionPrefs ? (
            <div className="space-y-[12px]">
              <div className="grid gap-[12px] sm:grid-cols-2">
                <label className="text-sm text-muted-foreground">
                  Sugar (g/day)
                  <Input
                    className="mt-[6px]"
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={dailySugarPreference}
                    placeholder="Optional"
                    onChange={(e) => setDailySugarPreference(e.target.value)}
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  Sodium (mg/day)
                  <Input
                    className="mt-[6px]"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={dailySodiumPreference}
                    placeholder="Optional"
                    onChange={(e) => setDailySodiumPreference(e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-sm text-muted-foreground">
                Saturated fat (g/day)
                <Input
                  className="mt-[6px]"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={dailySaturatedFatPreference}
                  placeholder="Optional"
                  onChange={(e) => setDailySaturatedFatPreference(e.target.value)}
                />
              </label>
              <div className="flex gap-[8px]">
                <button
                  onClick={async () => {
                    await saveProfile({
                      ...profile,
                      dailySugarPreferenceG: parseOptionalNumber(dailySugarPreference),
                      dailySodiumPreferenceMg: parseOptionalNumber(dailySodiumPreference),
                      dailySaturatedFatPreferenceG: parseOptionalNumber(dailySaturatedFatPreference),
                    });
                    setEditingNutritionPrefs(false);
                  }}
                  className="rounded-full bg-accent px-[16px] py-[8px] text-sm font-semibold text-accent-foreground"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setDailySugarPreference(profile.dailySugarPreferenceG?.toString() ?? "");
                    setDailySodiumPreference(profile.dailySodiumPreferenceMg?.toString() ?? "");
                    setDailySaturatedFatPreference(profile.dailySaturatedFatPreferenceG?.toString() ?? "");
                    setEditingNutritionPrefs(false);
                  }}
                  className="rounded-full bg-secondary px-[16px] py-[8px] text-sm font-semibold text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : hasNutritionPrefs ? (
            <div className="flex flex-wrap gap-[8px]">
              {nutritionPrefItems.map((item) => (
                <div key={item.label} className="rounded-full bg-secondary px-[12px] py-[6px]">
                  <span className="text-xs text-muted-foreground">{item.label} </span>
                  <span className="text-xs font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not set. Add your daily targets to see how each scan compares.</p>
          )}
        </div>

        {folders.length > 0 && (
          <div className="rounded-2xl bg-card p-[18px] shadow-card">
            <div className="mb-[14px] flex items-center gap-[8px]">
              <FolderHeart size={15} className="text-accent" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Folders</p>
            </div>
            <div className="space-y-[8px]">
              {folders.map((folder) => (
                <div key={folder.id} className="rounded-xl bg-secondary/35 p-[12px]">
                  {editingFolderId === folder.id ? (
                    <div className="space-y-[8px]">
                      <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} />
                      <div className="flex gap-[8px]">
                        <button
                          className="rounded-full bg-accent px-[12px] py-[6px] text-xs font-semibold text-accent-foreground"
                          onClick={async () => {
                            await renameFolder(folder.id, folderName);
                            setEditingFolderId(undefined);
                            setMenuFolderId(undefined);
                            setFolderName("");
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="rounded-full bg-background px-[12px] py-[6px] text-xs font-semibold text-foreground"
                          onClick={() => { setEditingFolderId(undefined); setMenuFolderId(undefined); setFolderName(""); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-[12px]">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {history.filter((scan) => scan.folderId === folder.id).length} scans
                        </p>
                      </div>
                      <div className="relative">
                        <button
                          className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full bg-background text-muted-foreground"
                          onClick={() => setMenuFolderId((c) => (c === folder.id ? undefined : folder.id))}
                          aria-label={`Actions for ${folder.name}`}
                        >
                          <EllipsisVertical size={15} />
                        </button>
                        {menuFolderId === folder.id && (
                          <div className="absolute right-0 top-[38px] z-10 min-w-[150px] rounded-2xl border border-border bg-card p-[6px] shadow-elevated">
                            <button className="flex w-full items-center gap-[8px] rounded-xl px-[10px] py-[9px] text-left text-sm text-foreground hover:bg-secondary"
                              onClick={async () => { await reorderFolder(folder.id, "up"); setMenuFolderId(undefined); }}>
                              <MoveUp size={14} /> Move up
                            </button>
                            <button className="flex w-full items-center gap-[8px] rounded-xl px-[10px] py-[9px] text-left text-sm text-foreground hover:bg-secondary"
                              onClick={async () => { await reorderFolder(folder.id, "down"); setMenuFolderId(undefined); }}>
                              <MoveDown size={14} /> Move down
                            </button>
                            <button className="flex w-full items-center gap-[8px] rounded-xl px-[10px] py-[9px] text-left text-sm text-foreground hover:bg-secondary"
                              onClick={() => { setEditingFolderId(folder.id); setMenuFolderId(undefined); setFolderName(folder.name); }}>
                              Rename
                            </button>
                            <button className="flex w-full items-center gap-[8px] rounded-xl px-[10px] py-[9px] text-left text-sm text-destructive hover:bg-secondary"
                              onClick={async () => { await deleteFolder(folder.id); setMenuFolderId(undefined); }}>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
          <button
            onClick={() => setShowPrivacyInfo((c) => !c)}
            className="flex min-h-[52px] w-full items-center gap-[14px] px-[18px] py-[14px]"
          >
            <Shield size={18} className="text-muted-foreground shrink-0" />
            <span className="flex-1 text-left text-sm font-medium text-foreground">Privacy and safety</span>
            <ChevronRight size={15} className={`text-muted-foreground transition-transform duration-200 ${showPrivacyInfo ? "rotate-90" : ""}`} />
          </button>
          {showPrivacyInfo && (
            <div className="border-t border-border px-[18px] pb-[16px] pt-[12px] space-y-[8px]">
              <p className="text-sm text-muted-foreground">Your scans, folders, notes, and reflections are linked to your account and persist between sessions.</p>
              <p className="text-sm text-muted-foreground">LabelWise is an educational tool for food-label literacy — not a medical or diagnostic service.</p>
            </div>
          )}
        </div>

        <button
          onClick={async () => { await signOut(); navigate("/auth"); }}
          className="flex min-h-[52px] w-full items-center gap-[14px] rounded-2xl bg-card px-[18px] py-[14px] shadow-card"
        >
          <LogOut size={18} className="text-muted-foreground shrink-0" />
          <span className="flex-1 text-left text-sm font-medium text-foreground">Log out</span>
          <ChevronRight size={15} className="text-muted-foreground" />
        </button>
      </div>

    </div>
  );
};

export default ProfileScreen;
