import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ProfileSummary from "@/components/ProfileSummary";
import { useAppState } from "@/context/AppStateContext";
import { hasProfileSelections } from "@/lib/analysis";
import { ArrowRight, Bookmark, BrainCircuit, Leaf, ScanLine } from "lucide-react";

const HomeScreen = () => {
  const navigate = useNavigate();
  const { currentUser, history, profile, selectScan } = useAppState();
  const latestScan = history[0];
  const profileReady = hasProfileSelections(profile);
  const favoriteCount = history.filter((item) => item.isFavorite).length;

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="bg-primary px-[24px] pb-[32px] pt-[48px] rounded-b-2xl">
        <div className="mb-[4px] flex items-center gap-[8px]">
          <Leaf size={20} className="text-accent" />
          <span className="text-sm font-semibold text-primary-foreground/70">Food Scanner</span>
        </div>
        <h1 className="text-[24px] font-bold text-primary-foreground">Hi {currentUser?.displayName || "there"}, scan with confidence</h1>
        <p className="mt-[4px] text-sm text-primary-foreground/60">
          A health psychology-led label literacy tool that reduces confusion, explains hidden ingredients, and helps you save better decisions for later.
        </p>
      </div>

      <div className="px-[24px] -mt-[24px] space-y-[16px]">
        <button
          onClick={() => navigate("/scan")}
          className="w-full rounded-2xl bg-card p-[24px] shadow-elevated flex items-center gap-[16px] transition-all duration-200 hover:shadow-card active:scale-[0.98]"
        >
          <div className="w-[56px] h-[56px] rounded-xl bg-accent/15 flex items-center justify-center">
            <ScanLine size={28} className="text-accent" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-foreground">Scan Food Label</p>
            <p className="text-sm text-muted-foreground">Use your camera, photo gallery, or manual ingredient paste</p>
          </div>
        </button>

        <div className="grid gap-[12px] sm:grid-cols-2">
          <div className="rounded-2xl bg-card p-[18px] shadow-card">
            <div className="mb-[10px] inline-flex items-center gap-[8px] text-sm font-semibold text-foreground">
              <Bookmark size={16} className="text-accent" /> Favorites
            </div>
            <p className="text-2xl font-bold text-foreground">{favoriteCount}</p>
            <p className="text-sm text-muted-foreground">Products you marked as useful, safe, or worth revisiting.</p>
          </div>
          <div className="rounded-2xl bg-card p-[18px] shadow-card">
            <div className="mb-[10px] inline-flex items-center gap-[8px] text-sm font-semibold text-foreground">
              <ScanLine size={16} className="text-accent" /> Saved scans
            </div>
            <p className="text-2xl font-bold text-foreground">{history.length}</p>
            <p className="text-sm text-muted-foreground">Your past label checks stay linked to this account for later reference.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-[20px] shadow-card">
          <div className="mb-[12px] flex items-center justify-between gap-[12px]">
            <div>
              <h2 className="text-base font-semibold text-foreground">Your active profile</h2>
              <p className="text-sm text-muted-foreground">
                {profileReady ? "These choices control the ingredient flags." : "Set preferences to personalize your results."}
              </p>
            </div>
            <button
              onClick={() => navigate("/profile-setup")}
              className="inline-flex items-center gap-[6px] text-sm font-medium text-accent"
            >
              {profileReady ? "Edit" : "Set up"} <ArrowRight size={16} />
            </button>
          </div>
          <ProfileSummary profile={profile} compact />
        </div>

        <div className="rounded-2xl bg-card p-[20px] shadow-card">
          <div className="mb-[8px] inline-flex items-center gap-[8px] text-sm font-semibold text-foreground">
            <BrainCircuit size={16} className="text-accent" /> Why this helps
          </div>
          <p className="text-sm text-muted-foreground">
            This app is designed to reduce cognitive load, make ingredient information personally relevant, and nudge healthier packaged-food choices without relying on technical label knowledge.
          </p>
        </div>

        <div className="rounded-2xl bg-card p-[20px] shadow-card">
          <div className="mb-[12px] flex items-center justify-between gap-[12px]">
            <div>
              <h2 className="text-base font-semibold text-foreground">Library</h2>
              <p className="text-sm text-muted-foreground">Open your saved scans, folders, and favorites in one place.</p>
            </div>
            <button onClick={() => navigate("/history")} className="text-sm font-medium text-accent">
              Open
            </button>
          </div>

          {latestScan ? (
            <button
              onClick={() => {
                selectScan(latestScan.id);
                navigate("/results");
              }}
              className="w-full rounded-xl bg-secondary/35 p-[14px] text-left transition-all duration-200 hover:bg-secondary/50"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest scan</p>
              <p className="mt-[6px] text-sm font-semibold text-foreground">{latestScan.productName}</p>
              <p className="text-xs text-muted-foreground">
                {latestScan.brandName ? `${latestScan.brandName} | ` : ""}
                {new Date(latestScan.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">No scans yet. Your saved items and folders will appear in the library after your first scan.</p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomeScreen;
