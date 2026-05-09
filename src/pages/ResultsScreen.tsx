import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import RiskFlagCard from "@/components/RiskFlagCard";
import RiskSummaryBadge from "@/components/RiskSummaryBadge";
import AiSummary from "@/components/AiSummary";
import BottomNav from "@/components/BottomNav";
import ProfileSummary from "@/components/ProfileSummary";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/context/AppStateContext";
import { formatNutrientValue, getProfileNutritionPreferences, hasMeaningfulNutritionFacts } from "@/lib/nutrition";
import { ArrowLeft, BookmarkPlus, BrainCircuit, ChevronDown, ChevronUp, Star, Trash2 } from "lucide-react";

const macroColors = ["#78B7E5", "#9ADE4C", "#F1B27A"];

type NutritionRowKey = "caloriesPerServing" | "carbohydratesG" | "sugarG" | "addedSugarG" | "totalFatG" | "saturatedFatG" | "proteinG" | "sodiumMg" | "fiberG";

const DAILY_INTAKE_FIELDS: Array<{ key: NutritionRowKey; label: string; unit: string; rdi: number }> = [
  { key: "caloriesPerServing", label: "Calories",        unit: "kcal", rdi: 2000 },
  { key: "carbohydratesG",     label: "Carbohydrates",   unit: "g",    rdi: 275  },
  { key: "sugarG",             label: "Sugar",           unit: "g",    rdi: 50   },
  { key: "addedSugarG",        label: "Added sugar",     unit: "g",    rdi: 50   },
  { key: "totalFatG",          label: "Total fat",       unit: "g",    rdi: 78   },
  { key: "saturatedFatG",      label: "Saturated fat",   unit: "g",    rdi: 20   },
  { key: "proteinG",           label: "Protein",         unit: "g",    rdi: 50   },
  { key: "sodiumMg",           label: "Sodium",          unit: "mg",   rdi: 2300 },
  { key: "fiberG",             label: "Fiber",           unit: "g",    rdi: 28   },
];

const ResultsScreen = () => {
  const navigate = useNavigate();
  const { history, folders, selectedScanId, toggleFavorite, moveScanToFolder, updateScanDetails, updateScanNote, deleteScan } =
    useAppState();
  const selectedScan = useMemo(
    () => history.find((item) => item.id === selectedScanId) ?? history[0],
    [history, selectedScanId],
  );
  const [titleDraft, setTitleDraft] = useState("");
  const [brandDraft, setBrandDraft] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);

  if (!selectedScan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-[24px]">
        <div className="max-w-sm rounded-3xl bg-card p-[24px] text-center shadow-card">
          <h1 className="text-xl font-semibold text-foreground">No scan selected</h1>
          <p className="mt-[10px] text-sm text-muted-foreground">Scan a label to see your summary here.</p>
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

  const nutritionFacts = selectedScan.analysis.nutritionFacts ?? selectedScan.nutritionFacts;
  const hasNutritionFacts = hasMeaningfulNutritionFacts(nutritionFacts);
  const nutritionPreferences = getProfileNutritionPreferences(selectedScan.profileSnapshot);
  const showHealthHaloPrompt = selectedScan.analysis.flags.some(
    (flag) =>
      flag.matchStrength === "cautionary" ||
      flag.matchedAlias.toLowerCase().includes("ins") ||
      flag.category === "Sweetener" ||
      flag.category === "Fat",
  );
  const currentFolderId = selectedScan.folderId ?? "none";
  const titleLooksUntitled = selectedScan.productName.trim().toLowerCase() === "untitled product";

  const macroChartData = useMemo(() => {
    const items = [
      { key: "carbs", label: "Carbohydrates", value: nutritionFacts?.carbohydratesG ?? 0, unit: "g" },
      { key: "protein", label: "Protein", value: nutritionFacts?.proteinG ?? 0, unit: "g" },
      { key: "fat", label: "Total fat", value: nutritionFacts?.totalFatG ?? 0, unit: "g" },
    ].filter((item) => item.value > 0);

    const total = items.reduce((sum, item) => sum + item.value, 0);
    return {
      total,
      items: items.map((item, index) => ({
        ...item,
        color: macroColors[index % macroColors.length],
        percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      })),
    };
  }, [nutritionFacts]);

  const keyNutritionFacts = useMemo(
    () =>
      [
        nutritionFacts?.servingSize
          ? { label: "Serving size", value: nutritionFacts.servingSize }
          : undefined,
        typeof nutritionFacts?.caloriesPerServing === "number"
          ? { label: "Calories", value: formatNutrientValue(nutritionFacts.caloriesPerServing, "kcal") }
          : undefined,
        typeof nutritionFacts?.sugarG === "number"
          ? { label: "Sugar", value: formatNutrientValue(nutritionFacts.sugarG, "g") }
          : undefined,
        typeof nutritionFacts?.addedSugarG === "number"
          ? { label: "Added sugar", value: formatNutrientValue(nutritionFacts.addedSugarG, "g") }
          : undefined,
        typeof nutritionFacts?.sodiumMg === "number"
          ? { label: "Sodium", value: formatNutrientValue(nutritionFacts.sodiumMg, "mg") }
          : undefined,
        typeof nutritionFacts?.saturatedFatG === "number"
          ? { label: "Saturated fat", value: formatNutrientValue(nutritionFacts.saturatedFatG, "g") }
          : undefined,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    [nutritionFacts],
  );

  const dailyIntakeRows = useMemo(() => {
    if (!nutritionFacts) return [];
    return DAILY_INTAKE_FIELDS
      .filter(({ key }) => typeof nutritionFacts[key] === "number")
      .map(({ key, label, unit, rdi }) => {
        const value = nutritionFacts[key] as number;
        const userPref =
          key === "sugarG" ? nutritionPreferences.dailySugarPreferenceG
          : key === "sodiumMg" ? nutritionPreferences.dailySodiumPreferenceMg
          : key === "saturatedFatG" ? nutritionPreferences.dailySaturatedFatPreferenceG
          : undefined;
        if (typeof userPref !== "number") return null;
        const pct = Math.round((value / userPref) * 100);
        return { key, label, value, unit, reference: userPref, pct, exceeds: value > userPref };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [nutritionFacts, nutritionPreferences]);

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
          <button
            onClick={() => toggleFavorite(selectedScan.id)}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-primary-foreground/10"
          >
            <Star size={18} className={selectedScan.isFavorite ? "fill-accent text-accent" : "text-primary-foreground"} />
          </button>
        </div>

        <h1 className="text-[20px] font-bold text-primary-foreground">{selectedScan.productName}</h1>
        <p className="text-sm text-primary-foreground/60">
          {selectedScan.brandName ? `${selectedScan.brandName} · ` : ""}
          Scanned {new Date(selectedScan.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="mt-[24px] space-y-[16px] px-[24px]">
        <RiskSummaryBadge level={selectedScan.analysis.overallRisk} flagCount={selectedScan.analysis.flags.length} />

        <AiSummary scan={selectedScan} />

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
              <p className="text-sm font-semibold text-foreground">No matches found</p>
              <p className="mt-[6px] text-sm text-muted-foreground">No ingredients matched your saved concerns.</p>
            </div>
          )}
        </div>

        {hasNutritionFacts && (
          <div className="rounded-[28px] bg-card p-[20px] shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-[10px]">
              <div>
                <h2 className="text-[18px] font-semibold text-foreground">Nutrition Overview</h2>
                <p className="mt-[4px] max-w-2xl text-sm text-muted-foreground">
                  A calm per-serving view of the label, grounded in the values visible on the package.
                </p>
              </div>
              {nutritionFacts?.servingSize ? (
                <span className="rounded-full bg-secondary px-[12px] py-[6px] text-xs font-medium text-foreground">
                  {nutritionFacts.servingSize}
                </span>
              ) : null}
            </div>

            <div className="mt-[16px] grid gap-[16px] xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[24px] border border-border bg-secondary/20 p-[18px]">
                <div className="flex flex-wrap items-start justify-between gap-[8px]">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Per-serving balance</h3>
                    <p className="mt-[4px] text-sm text-muted-foreground">
                      A simple view of carbohydrates, protein, and total fat.
                    </p>
                  </div>
                </div>

                {macroChartData.items.length > 0 ? (
                  <div className="mt-[10px] grid gap-[10px] md:grid-cols-[220px_1fr] md:items-center">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={macroChartData.items}
                            dataKey="value"
                            innerRadius={56}
                            outerRadius={84}
                            stroke="none"
                            paddingAngle={3}
                          >
                            {macroChartData.items.map((item) => (
                              <Cell key={item.key} fill={item.color} />
                            ))}
                          </Pie>
                          <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                            Total shown
                          </text>
                          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[22px] font-semibold">
                            {formatNutrientValue(macroChartData.total, "g")}
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-[14px]">
                      {macroChartData.items.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-[12px]">
                          <div className="flex min-w-0 items-center gap-[10px]">
                            <span className="h-[14px] w-[14px] rounded-full" style={{ backgroundColor: item.color }} />
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                {item.label}
                              </p>
                              <p className="text-[16px] font-semibold text-foreground">
                                {formatNutrientValue(item.value, item.unit)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-foreground">{item.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-[12px] rounded-[18px] bg-background px-[16px] py-[14px] text-sm text-muted-foreground">
                    Add carbohydrates, protein, or total fat to show this nutrition view.
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-border bg-secondary/20 p-[18px]">
                <h3 className="text-base font-semibold text-foreground">Key per-serving facts</h3>
                <p className="mt-[4px] text-sm text-muted-foreground">
                  The rest of the panel at a glance, without repeating the same values in multiple formats.
                </p>

                {keyNutritionFacts.length > 0 ? (
                  <div className="mt-[14px] grid gap-[10px] sm:grid-cols-2">
                    {keyNutritionFacts.map((fact) => (
                      <div key={fact.label} className="rounded-[20px] bg-background px-[16px] py-[14px]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {fact.label}
                        </p>
                        <p className="mt-[8px] text-[16px] font-semibold text-foreground">{fact.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-[12px] rounded-[18px] bg-background px-[16px] py-[14px] text-sm text-muted-foreground">
                    No nutrition fields were available for this scan.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-[16px] rounded-[24px] border border-border bg-secondary/20 p-[18px]">
              <h3 className="text-base font-semibold text-foreground">Daily intake comparison</h3>
              <p className="mt-[4px] text-sm text-muted-foreground">How this serving compares to your saved daily targets</p>
              {dailyIntakeRows.length > 0 ? (
                <div className="mt-[14px] space-y-[14px]">
                  {dailyIntakeRows.map((row) => (
                    <div key={row.key}>
                      <div className="flex items-center justify-between gap-[12px]">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{row.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNutrientValue(row.value, row.unit)} · {row.pct}% of your {formatNutrientValue(row.reference, row.unit)} target
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-[10px] py-[4px] text-[11px] font-medium ${
                            row.exceeds ? "bg-[#F7E5D7] text-[#8A4B22]" : "bg-[#E9F8D9] text-[#355A16]"
                          }`}
                        >
                          {row.exceeds ? "Above target" : "Within target"}
                        </span>
                      </div>
                      <div className="mt-[8px] h-[8px] overflow-hidden rounded-full bg-background">
                        <div
                          className={`h-full rounded-full transition-all ${row.exceeds ? "bg-[#E6B484]" : "bg-[#9ADE4C]"}`}
                          style={{ width: `${Math.min(row.pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-[12px] text-sm text-muted-foreground">
                  Set daily targets for sugar, sodium, or saturated fat in your profile to see comparisons here.
                </p>
              )}
            </div>
          </div>
        )}

        {showHealthHaloPrompt && (
          <div className="rounded-xl bg-card p-[14px] shadow-card flex gap-[10px] items-start">
            <BrainCircuit size={15} className="text-accent mt-[1px] shrink-0" />
            <p className="text-sm text-muted-foreground">
              Even products that look simple on the front can contain hidden additives or broad terms in the ingredient list.
            </p>
          </div>
        )}

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <h3 className="mb-[8px] text-sm font-semibold text-foreground">Your note</h3>
          <Textarea
            className="min-h-[90px] rounded-2xl border-input bg-secondary/35 px-[16px] py-[14px]"
            value={selectedScan.userNote ?? ""}
            placeholder="e.g. Compare later, worked for me"
            onChange={(event) => updateScanNote(selectedScan.id, event.target.value)}
          />
        </div>

        <div className="rounded-xl bg-card p-[16px] shadow-card">
          <h3 className="mb-[12px] text-sm font-semibold text-foreground">Save details</h3>
          <div className="grid gap-[10px] sm:grid-cols-[1.2fr_1fr]">
            <label className="text-sm text-muted-foreground">
              Product name
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

          <label className="mt-[10px] block text-sm text-muted-foreground">
            Folder
            <select
              value={currentFolderId}
              onChange={(event) => moveScanToFolder(selectedScan.id, event.target.value === "none" ? undefined : event.target.value)}
              className="mt-[6px] h-[44px] w-full rounded-xl border border-border bg-background px-[12px] text-sm text-foreground"
            >
              <option value="none">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-[12px] flex gap-[8px]">
            <button
              onClick={handleSaveScanDetails}
              className="inline-flex h-[42px] flex-1 items-center justify-center rounded-xl bg-secondary px-[14px] text-sm font-medium text-foreground"
            >
              Save
            </button>
            <button
              onClick={() => toggleFavorite(selectedScan.id)}
              className="inline-flex h-[42px] items-center justify-center gap-[6px] rounded-xl bg-secondary px-[14px] text-sm font-medium text-foreground"
            >
              <BookmarkPlus size={15} /> {selectedScan.isFavorite ? "Saved" : "Favorite"}
            </button>
            <button
              onClick={handleDeleteScan}
              className="inline-flex h-[42px] items-center justify-center gap-[6px] rounded-xl bg-secondary px-[14px] text-sm font-medium text-foreground"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="flex w-full items-center justify-between p-[16px] text-sm font-semibold text-foreground"
          >
            Profile used for this scan
            {showProfile ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </button>
          {showProfile && (
            <div className="px-[16px] pb-[16px]">
              <ProfileSummary profile={selectedScan.profileSnapshot} compact />
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <button
            onClick={() => setShowIngredients((v) => !v)}
            className="flex w-full items-center justify-between p-[16px] text-sm font-semibold text-foreground"
          >
            All ingredients
            {showIngredients ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </button>
          {showIngredients && (
            <p className="px-[16px] pb-[16px] text-xs leading-relaxed text-muted-foreground">
              {selectedScan.analysis.normalizedIngredients.join(", ")}
            </p>
          )}
        </div>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/60 pb-[8px]">
          Educational tool only. Does not diagnose conditions, prescribe diets, or give medical advice.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default ResultsScreen;
