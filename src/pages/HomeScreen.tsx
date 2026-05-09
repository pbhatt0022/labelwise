import { useNavigate } from "react-router-dom";
import ProfileSummary from "@/components/ProfileSummary";
import { useAppState } from "@/context/AppStateContext";
import { hasProfileSelections } from "@/lib/analysis";
import { ArrowRight, Bookmark, Leaf, ScanLine } from "lucide-react";

const HomeScreen = () => {
  const navigate = useNavigate();
  const { currentUser, history, profile, selectScan } = useAppState();
  const latestScan = history[0];
  const profileReady = hasProfileSelections(profile);
  const favoriteCount = history.filter((item) => item.isFavorite).length;

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="bg-primary px-[24px] pb-[48px] pt-[56px] rounded-b-3xl">
        <div className="mb-[20px] flex items-center gap-[8px]">
          <Leaf size={16} className="text-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/50">LabelWise</span>
        </div>
        <h1 className="text-[30px] font-bold leading-tight text-primary-foreground">
          {currentUser?.displayName ? `Hi ${currentUser.displayName}.` : "Know what's"}<br />
          {currentUser?.displayName ? "Know what's in your food." : "in your food."}
        </h1>
        <p className="mt-[10px] text-sm leading-relaxed text-primary-foreground/55">
            Scan any label to understand ingredients, nutrition, and diet compatibility — matched to your profile.
        </p>
      </div>

      <div className="px-[24px] -mt-[28px] space-y-[12px]">
        <button
          onClick={() => navigate("/scan")}
          className="w-full rounded-2xl bg-accent p-[20px] shadow-elevated flex items-center gap-[16px] transition-all duration-200 active:scale-[0.98]"
        >
          <div className="w-[48px] h-[48px] rounded-xl bg-accent-foreground/10 flex items-center justify-center shrink-0">
            <ScanLine size={24} className="text-accent-foreground" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-base font-bold text-accent-foreground">Scan a label</p>
            <p className="text-sm text-accent-foreground/65">Camera, photo, or manual entry</p>
          </div>
          <ArrowRight size={20} className="text-accent-foreground/50 shrink-0" />
        </button>

        <div className="grid grid-cols-2 gap-[12px]">
          <div className="rounded-2xl bg-card p-[18px] shadow-card">
            <div className="mb-[6px] flex items-center gap-[6px]">
              <ScanLine size={13} className="text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Scans</p>
            </div>
            <p className="text-[32px] font-bold leading-none text-foreground">{history.length}</p>
          </div>
          <div className="rounded-2xl bg-card p-[18px] shadow-card">
            <div className="mb-[6px] flex items-center gap-[6px]">
              <Bookmark size={13} className="text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Favorites</p>
            </div>
            <p className="text-[32px] font-bold leading-none text-foreground">{favoriteCount}</p>
          </div>
        </div>

        {latestScan && (
          <button
            onClick={() => {
              selectScan(latestScan.id);
              navigate("/results");
            }}
            className="w-full rounded-2xl bg-card p-[18px] shadow-card text-left flex items-center gap-[14px] transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Last scan</p>
              <p className="mt-[4px] text-sm font-semibold text-foreground truncate">{latestScan.productName}</p>
              <p className="text-xs text-muted-foreground">
                {latestScan.brandName ? `${latestScan.brandName} · ` : ""}
                {new Date(latestScan.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </div>
            <ArrowRight size={16} className="text-muted-foreground shrink-0" />
          </button>
        )}

        <div className="rounded-2xl bg-card p-[18px] shadow-card">
          <div className="mb-[14px] flex items-center justify-between gap-[12px]">
            <p className="text-sm font-semibold text-foreground">Your profile</p>
            <button
              onClick={() => navigate("/profile-setup")}
              className="inline-flex items-center gap-[4px] text-sm font-medium text-primary"
            >
              {profileReady ? "Edit" : "Set up"} <ArrowRight size={14} />
            </button>
          </div>
          {!profileReady && (
            <p className="mb-[12px] text-xs text-muted-foreground">
              Add your allergies, diet preferences, sensitivities, or custom avoids so results are matched to you.
            </p>
          )}
          <ProfileSummary profile={profile} compact />
        </div>
      </div>

    </div>
  );
};

export default HomeScreen;
