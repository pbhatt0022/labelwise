import { useState } from "react";
import { useNavigate } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import ProfileSummary from "@/components/ProfileSummary";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/context/AppStateContext";
import { ChevronRight, EllipsisVertical, FolderHeart, LogOut, Mail, MoveDown, MoveUp, Shield, SlidersHorizontal } from "lucide-react";

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { currentUser, profile, folders, history, renameFolder, deleteFolder, reorderFolder, signOut } = useAppState();
  const [editingFolderId, setEditingFolderId] = useState<string | undefined>(undefined);
  const [menuFolderId, setMenuFolderId] = useState<string | undefined>(undefined);
  const [folderName, setFolderName] = useState("");
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="rounded-b-2xl bg-primary px-[24px] pb-[32px] pt-[48px]">
        <div className="flex items-center gap-[16px]">
          <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-accent/20">
            <SlidersHorizontal size={24} className="text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">{currentUser?.displayName || "Your Profile"}</h1>
            <p className="text-sm text-primary-foreground/60">Personalized settings, saved spaces, and account tools</p>
          </div>
        </div>
      </div>

      <div className="mt-[24px] space-y-[16px] px-[24px]">
        <div className="rounded-xl bg-card p-[16px] shadow-card animate-fade-in">
          <div className="mb-[12px] flex items-center justify-between gap-[12px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
              <p className="mt-[4px] text-sm text-muted-foreground">Your scanner data is linked to this sign-in.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-[8px] text-sm text-foreground">
            <Mail size={16} className="text-muted-foreground" /> {currentUser?.email}
          </div>
        </div>

        <div className="rounded-xl bg-card p-[16px] shadow-card animate-fade-in">
          <div className="mb-[12px] flex items-center justify-between gap-[12px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active preferences</p>
              <p className="mt-[4px] text-sm text-muted-foreground">These settings decide what gets flagged and how explanations are personalized.</p>
            </div>
            <button onClick={() => navigate("/profile-setup")} className="text-sm font-medium text-accent">
              Edit
            </button>
          </div>
          <ProfileSummary profile={profile} />
        </div>

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <div className="mb-[12px] flex items-center gap-[8px]">
            <FolderHeart size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Folders</h2>
          </div>
          <div className="space-y-[10px]">
            {folders.map((folder) => (
              <div key={folder.id} className="rounded-2xl bg-secondary/35 p-[12px]">
                {editingFolderId === folder.id ? (
                  <div className="space-y-[8px]">
                    <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} />
                    <div className="flex gap-[8px]">
                      <button
                        className="rounded-full bg-accent px-[12px] py-[8px] text-xs font-semibold text-accent-foreground"
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
                        className="rounded-full bg-background px-[12px] py-[8px] text-xs font-semibold text-foreground"
                        onClick={() => {
                          setEditingFolderId(undefined);
                          setMenuFolderId(undefined);
                          setFolderName("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-[12px]">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {history.filter((scan) => scan.folderId === folder.id).length} saved scans in this folder
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-background text-muted-foreground"
                        onClick={() => setMenuFolderId((current) => (current === folder.id ? undefined : folder.id))}
                        aria-label={`Open actions for ${folder.name}`}
                      >
                        <EllipsisVertical size={16} />
                      </button>

                      {menuFolderId === folder.id && (
                        <div className="absolute right-0 top-[40px] z-10 min-w-[160px] rounded-2xl border border-border bg-card p-[8px] shadow-elevated">
                          <button
                            className="flex w-full items-center gap-[8px] rounded-xl px-[10px] py-[10px] text-left text-sm text-foreground hover:bg-secondary"
                            onClick={async () => {
                              await reorderFolder(folder.id, "up");
                              setMenuFolderId(undefined);
                            }}
                          >
                            <MoveUp size={14} /> Move up
                          </button>
                          <button
                            className="flex w-full items-center gap-[8px] rounded-xl px-[10px] py-[10px] text-left text-sm text-foreground hover:bg-secondary"
                            onClick={async () => {
                              await reorderFolder(folder.id, "down");
                              setMenuFolderId(undefined);
                            }}
                          >
                            <MoveDown size={14} /> Move down
                          </button>
                          <button
                            className="flex w-full items-center gap-[8px] rounded-xl px-[10px] py-[10px] text-left text-sm text-foreground hover:bg-secondary"
                            onClick={() => {
                              setEditingFolderId(folder.id);
                              setMenuFolderId(undefined);
                              setFolderName(folder.name);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="flex w-full items-center gap-[8px] rounded-xl px-[10px] py-[10px] text-left text-sm text-destructive hover:bg-secondary"
                            onClick={async () => {
                              await deleteFolder(folder.id);
                              setMenuFolderId(undefined);
                            }}
                          >
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

        <div className="space-y-[4px] mt-[16px]">
          <div className="rounded-xl bg-card shadow-card transition-all hover:shadow-elevated">
            <button
              onClick={() => setShowPrivacyInfo((current) => !current)}
              className="flex min-h-[44px] w-full items-center gap-[16px] p-[16px]"
            >
              <Shield size={20} className="text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">Privacy and safety</span>
              <ChevronRight size={16} className={`text-muted-foreground transition-transform ${showPrivacyInfo ? "rotate-90" : ""}`} />
            </button>
            {showPrivacyInfo && (
              <div className="border-t border-border px-[16px] pb-[16px] pt-[8px] text-sm text-muted-foreground space-y-[8px]">
                <p>Your saved profile, scans, folders, notes, and reflections are linked to your signed-in account so they can persist between sessions.</p>
                <p>This app is designed to support food-label literacy and healthier decision-making habits, but it is still an educational tool rather than a medical or diagnostic service.</p>
                <p>Use the scanner as a guide to pause, compare products, and reflect on buying choices, especially when a label feels confusing or rushed.</p>
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            className="flex min-h-[44px] w-full items-center gap-[16px] rounded-xl bg-card p-[16px] shadow-card transition-all hover:shadow-elevated"
          >
            <LogOut size={20} className="text-muted-foreground" />
            <span className="flex-1 text-left text-sm font-medium text-foreground">Log out</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
