import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import RiskFlagCard from "@/components/RiskFlagCard";
import RiskSummaryBadge from "@/components/RiskSummaryBadge";
import BottomNav from "@/components/BottomNav";
import ProfileSummary from "@/components/ProfileSummary";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/context/AppStateContext";
import { ArrowLeft, BookmarkPlus, BrainCircuit, FolderHeart, PencilLine, ShieldAlert, Star, Trash2 } from "lucide-react";

const reflectionLabels = {
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
} as const;

const ResultsScreen = () => {
  const navigate = useNavigate();
  const { history, folders, selectedScanId, toggleFavorite, moveScanToFolder, updateScanDetails, updateScanNote, saveReflection, getReflection, deleteScan } = useAppState();
  const selectedScan = useMemo(
    () => history.find((item) => item.id === selectedScanId) ?? history[0],
    [history, selectedScanId],
  );
  const [titleDraft, setTitleDraft] = useState("");
  const [brandDraft, setBrandDraft] = useState("");

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

  const reflection = getReflection(selectedScan.id);
  const showHealthHaloPrompt = selectedScan.analysis.flags.some(
    (flag) =>
      flag.matchStrength === "cautionary" ||
      flag.matchedAlias.toLowerCase().includes("ins") ||
      flag.category === "Sweetener" ||
      flag.category === "Fat",
  );
  const currentFolderId = selectedScan.folderId ?? "none";
  const titleLooksUntitled = selectedScan.productName.trim().toLowerCase() === "untitled product";

  useEffect(() => {
    setTitleDraft(titleLooksUntitled ? "" : selectedScan.productName);
    setBrandDraft(selectedScan.brandName ?? "");
  }, [selectedScan.id, selectedScan.productName, selectedScan.brandName, titleLooksUntitled]);

  const handleSaveScanDetails = async () => {
    await updateScanDetails(selectedScan.id, {
      productName: titleDraft.trim() || selectedScan.productName,
      brandName: brandDraft,
    });
  };

  const handleDeleteScan = async () => {
    await deleteScan(selectedScan.id);
    navigate("/history");
  };

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="rounded-b-2xl bg-primary px-[24px] pb-[24px] pt-[48px]">
        <div className="mb-[16px] flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-primary-foreground/10"
          >
            <ArrowLeft size={20} className="text-primary-foreground" />
          </button>
          <div className="flex items-center gap-[8px]">
            <button
              onClick={() => toggleFavorite(selectedScan.id)}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-primary-foreground/10"
            >
              <Star size={18} className={selectedScan.isFavorite ? "fill-accent text-accent" : "text-primary-foreground"} />
            </button>
            <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-primary-foreground/10">
              <ShieldAlert size={18} className="text-primary-foreground" />
            </div>
          </div>
        </div>

        <h1 className="text-[20px] font-bold text-primary-foreground">{selectedScan.productName}</h1>
        <p className="text-sm text-primary-foreground/60">
          {selectedScan.brandName ? `${selectedScan.brandName} | ` : ""}
          Scanned {new Date(selectedScan.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="mt-[24px] space-y-[16px] px-[24px]">
        <RiskSummaryBadge level={selectedScan.analysis.overallRisk} flagCount={selectedScan.analysis.flags.length} />

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <div className="mb-[10px] flex items-center gap-[8px] text-sm font-semibold text-foreground">
            <PencilLine size={16} className="text-accent" /> {titleLooksUntitled ? "Name this scan" : "Edit scan title"}
          </div>
          <div className="grid gap-[10px] sm:grid-cols-[1.2fr_1fr]">
            <label className="text-sm text-muted-foreground">
              Product title
              <Input
                className="mt-[6px]"
                value={titleDraft}
                placeholder="e.g. Chocolate granola bar"
                onChange={(event) => setTitleDraft(event.target.value)}
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Brand
              <Input
                className="mt-[6px]"
                value={brandDraft}
                placeholder="Optional"
                onChange={(event) => setBrandDraft(event.target.value)}
              />
            </label>
          </div>
          <button
            onClick={handleSaveScanDetails}
            className="mt-[12px] inline-flex h-[42px] items-center justify-center rounded-xl bg-secondary px-[14px] text-sm font-medium text-foreground"
          >
            Save title
          </button>
        </div>

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <div className="mb-[10px] flex items-center gap-[8px] text-sm font-semibold text-foreground">
            <FolderHeart size={16} className="text-accent" /> Save and organize
          </div>
          <div className="grid gap-[10px] sm:grid-cols-2">
            <label className="text-sm text-muted-foreground">
              Folder
              <select
                value={currentFolderId}
                onChange={(event) => moveScanToFolder(selectedScan.id, event.target.value === "none" ? undefined : event.target.value)}
                className="mt-[6px] h-[44px] w-full rounded-xl border border-border bg-background px-[12px] text-sm text-foreground"
              >
                <option value="none">No folder yet</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => toggleFavorite(selectedScan.id)}
              className="mt-[24px] inline-flex h-[44px] items-center justify-center gap-[8px] rounded-xl bg-secondary px-[16px] text-sm font-medium text-foreground"
            >
              <BookmarkPlus size={16} /> {selectedScan.isFavorite ? "Remove favorite" : "Favorite this scan"}
            </button>
          </div>
          <button
            onClick={handleDeleteScan}
            className="mt-[12px] inline-flex h-[42px] items-center justify-center gap-[8px] rounded-xl bg-secondary px-[14px] text-sm font-medium text-foreground"
          >
            <Trash2 size={16} /> Delete this scan
          </button>
        </div>

        {showHealthHaloPrompt && (
          <div className="rounded-xl bg-card p-[16px] shadow-card">
            <div className="mb-[8px] inline-flex items-center gap-[8px] text-sm font-semibold text-foreground">
              <BrainCircuit size={16} className="text-accent" /> Health halo reminder
            </div>
            <p className="text-sm text-muted-foreground">
              Even when a product sounds healthy or simple from the pack design, the ingredient list can still contain hidden additives, INS codes, or broad terms that deserve a closer look.
            </p>
          </div>
        )}

        <div className="space-y-[8px]">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Flagged for you</h3>
          {selectedScan.analysis.flags.length > 0 ? (
            selectedScan.analysis.flags.map((flag) => (
              <RiskFlagCard
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
                plainLanguageMeaning={flag.plainLanguageMeaning}
                literacyTip={flag.literacyTip}
                nudgeMessage={flag.nudgeMessage}
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

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <h3 className="mb-[12px] text-sm font-semibold text-foreground">Quick reflection</h3>
          <p className="text-sm text-muted-foreground">Would this result change your buying decision?</p>
          <div className="mt-[10px] flex gap-[8px]">
            {(["yes", "maybe", "no"] as const).map((choice) => (
              <button
                key={choice}
                onClick={() => saveReflection(selectedScan.id, { purchaseIntent: choice })}
                className={`rounded-full px-[12px] py-[8px] text-sm font-medium ${reflection?.purchaseIntent === choice ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"}`}
              >
                {reflectionLabels[choice]}
              </button>
            ))}
          </div>

          <p className="mt-[14px] text-sm text-muted-foreground">Was this explanation easy to understand?</p>
          <div className="mt-[10px] flex gap-[8px]">
            {(["yes", "maybe", "no"] as const).map((choice) => (
              <button
                key={`clarity-${choice}`}
                onClick={() => saveReflection(selectedScan.id, { clarity: choice })}
                className={`rounded-full px-[12px] py-[8px] text-sm font-medium ${reflection?.clarity === choice ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"}`}
              >
                {reflectionLabels[choice]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <h3 className="mb-[8px] text-sm font-semibold text-foreground">Your note</h3>
          <Textarea
            className="min-h-[110px] rounded-2xl border-input bg-secondary/35 px-[16px] py-[14px]"
            value={selectedScan.userNote ?? ""}
            placeholder="Add a quick note like safe for me, compare later, or check another brand."
            onChange={(event) => updateScanNote(selectedScan.id, event.target.value)}
          />
        </div>

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <h3 className="mb-[12px] text-sm font-semibold text-foreground">Profile used for this scan</h3>
          <ProfileSummary profile={selectedScan.profileSnapshot} compact />
        </div>

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <h3 className="mb-[8px] text-sm font-semibold text-foreground">All Ingredients</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{selectedScan.analysis.normalizedIngredients.join(", ")}</p>
        </div>

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <h3 className="mb-[8px] text-sm font-semibold text-foreground">Important note</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This tool is an educational aid for label literacy. Health-related flags are advisory only and this app may miss ingredients if the entered text is incomplete.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ResultsScreen;
