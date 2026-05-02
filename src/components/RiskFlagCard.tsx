import { cn } from "@/lib/utils";

interface RiskFlagCardProps {
  category: string;
  ingredient: string;
  explanation: string;
  whyItMatters: string;
  reasons: string[];
  suggestion?: string;
  risk: "low" | "moderate" | "high";
  cautionary?: boolean;
  matchStrength: "exact" | "likely" | "cautionary";
  tone: "strong" | "medium" | "advisory";
  sourceLabel: string;
  cautionMessage?: string;
  plainLanguageMeaning?: string;
  literacyTip?: string;
  nudgeMessage?: string;
}

const riskConfig = {
  low: { border: "border-risk-low/30", dot: "bg-risk-low", label: "Low" },
  moderate: { border: "border-risk-moderate/30", dot: "bg-risk-moderate", label: "Moderate" },
  high: { border: "border-risk-high/30", dot: "bg-risk-high", label: "Worth checking" },
};

const RiskFlagCard = ({
  category,
  ingredient,
  explanation,
  whyItMatters,
  reasons,
  suggestion,
  risk,
  cautionary,
  matchStrength,
  tone,
  sourceLabel,
  cautionMessage,
  plainLanguageMeaning,
  literacyTip,
  nudgeMessage,
}: RiskFlagCardProps) => {
  const config = riskConfig[risk];
  const primarySupportText = plainLanguageMeaning || whyItMatters;
  const compactSourceLabel = reasons[0] ? `Flagged because ${reasons[0]}` : sourceLabel;
  const shouldShowLiteracyTip = Boolean(literacyTip && (cautionary || matchStrength === "cautionary" || sourceLabel.includes("watch")));

  return (
    <div className={cn("bg-card rounded-xl p-[16px] shadow-card border animate-fade-in", config.border)}>
      <div className="flex items-center gap-[8px] mb-[8px]">
        <span className="rounded-full bg-secondary px-[10px] py-[5px] text-xs font-semibold text-foreground">{category}</span>
        <span className="rounded-full bg-secondary px-[10px] py-[5px] text-[11px] font-medium text-muted-foreground capitalize">
          {matchStrength}
        </span>
        <div className="ml-auto flex items-center gap-[8px]">
          <span className={cn("w-[8px] h-[8px] rounded-full", config.dot)} />
          <span className="text-xs text-muted-foreground">{config.label}</span>
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground mb-[4px]">{ingredient}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
      {primarySupportText && <p className="mt-[8px] text-xs text-muted-foreground">{primarySupportText}</p>}

      <div className="mt-[10px] flex flex-wrap gap-[8px]">
        <span className="rounded-full bg-primary/10 px-[10px] py-[5px] text-[11px] font-medium text-primary">{compactSourceLabel}</span>
        <span className="rounded-full bg-secondary px-[10px] py-[5px] text-[11px] font-medium text-muted-foreground">Source: {sourceLabel}</span>
      </div>

      {(cautionary || cautionMessage) && (
        <p className="mt-[8px] text-xs text-muted-foreground">
          {cautionMessage ?? 'This is a cautious match because some labels use broad names like "vegetable oil."'}
        </p>
      )}

      {shouldShowLiteracyTip && <p className="mt-[8px] text-xs text-muted-foreground">Label tip: {literacyTip}</p>}

      {(suggestion || nudgeMessage) && <p className="text-xs text-muted-foreground mt-[8px] pt-[8px] border-t border-border italic">Suggested action: {suggestion ?? nudgeMessage}</p>}
    </div>
  );
};

export default RiskFlagCard;
