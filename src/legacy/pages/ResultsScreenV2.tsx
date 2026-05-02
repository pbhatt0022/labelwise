import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DemoRiskSummaryBadge from "@/components/DemoRiskSummaryBadge";
import DemoRiskFlagCard from "@/components/DemoRiskFlagCard";
import ProfileSummary from "@/components/ProfileSummary";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/context/AppStateContext";
import { ArrowLeft, ShieldAlert } from "lucide-react";

const ResultsScreenV2 = () => {
  const navigate = useNavigate();
  const { history, selectedScanId } = useAppState();
  const selectedScan = useMemo(
    () => history.find((item) => item.id === selectedScanId) ?? history[0],
    [history, selectedScanId],
  );

  if (!selectedScan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-[24px]">
        <div className="max-w-sm rounded-3xl bg-card p-[24px] text-center shadow-card">
          <h1 className="text-xl font-semibold text-foreground">No scan selected</h1>
          <p className="mt-[10px] text-sm text-muted-foreground">
            Analyze a label first and your personalized ingredient summary will appear here.
          </p>
          <button
            onClick={() => navigate("/scan")}
            className="mt-[20px] inline-flex h-[48px] items-center justify-center rounded-full bg-accent px-[24px] text-sm font-semibold text-accent-foreground"
          >
            Go to scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="bg-primary px-[24px] pt-[48px] pb-[24px] rounded-b-2xl">
        <div className="flex items-center justify-between mb-[16px]">
          <button
            onClick={() => navigate(-1)}
            className="w-[44px] h-[44px] rounded-full bg-primary-foreground/10 flex items-center justify-center"
          >
            <ArrowLeft size={20} className="text-primary-foreground" />
          </button>
          <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-primary-foreground/10">
            <ShieldAlert size={18} className="text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-[20px] font-bold text-primary-foreground">{selectedScan.productName}</h1>
        <p className="text-sm text-primary-foreground/60">
          {selectedScan.brandName ? `${selectedScan.brandName} | ` : ""}
          Scanned {new Date(selectedScan.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="px-[24px] mt-[24px] space-y-[16px]">
        <DemoRiskSummaryBadge level={selectedScan.analysis.overallRisk} flagCount={selectedScan.analysis.flags.length} />

        <div className="space-y-[8px]">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Flagged for you</h3>
          {selectedScan.analysis.flags.length > 0 ? (
            selectedScan.analysis.flags.map((flag) => (
              <DemoRiskFlagCard
                key={`${flag.ruleId}-${flag.canonicalIngredientId}`}
                category={flag.category}
                ingredient={flag.ingredient}
                explanation={flag.explanation}
                whyItMatters={flag.whyItMatters}
                reasons={flag.profileReasons}
                suggestion={flag.suggestion}
                risk={flag.risk}
                cautionary={flag.cautionary}
                matchStrength={flag.matchStrength}
                tone={flag.tone}
                sourceLabel={flag.flagSource === "custom_avoid" ? "Custom avoid" : flag.concernDisplayName}
                cautionMessage={flag.cautionMessage}
              />
            ))
          ) : (
            <div className="rounded-2xl bg-card p-[18px] shadow-card">
              <p className="text-sm font-semibold text-foreground">No profile-based flags found</p>
              <p className="mt-[6px] text-sm text-muted-foreground">
                This label did not match the concerns currently saved in your profile.
              </p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl p-[16px] shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-[12px]">Profile used for this scan</h3>
          <ProfileSummary profile={selectedScan.profileSnapshot} compact />
        </div>

        <div className="bg-card rounded-xl p-[16px] shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-[8px]">All Ingredients</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {selectedScan.analysis.normalizedIngredients.join(", ")}
          </p>
        </div>

        <div className="bg-card rounded-xl p-[16px] shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-[8px]">Important note</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This tool is an educational aid for label literacy. Health-related flags are advisory only and this app may miss
            ingredients if the entered text is incomplete.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ResultsScreenV2;
