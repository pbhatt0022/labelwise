import { cn } from "@/lib/utils";

interface RiskSummaryBadgeProps {
  level: "low" | "moderate" | "high";
  flagCount: number;
}

const config = {
  low: { bg: "bg-risk-low/15", text: "text-risk-low", label: "Looks Good" },
  moderate: { bg: "bg-risk-moderate/15", text: "text-risk-moderate", label: "Some Concerns" },
  high: { bg: "bg-risk-high/15", text: "text-risk-high", label: "Worth Checking" },
};

const RiskSummaryBadge = ({ level, flagCount }: RiskSummaryBadgeProps) => {
  const c = config[level];
  return (
    <div className={cn("rounded-2xl p-[24px] text-center animate-scale-in", c.bg)}>
      <p className={cn("text-2xl font-bold", c.text)}>{c.label}</p>
      <p className="text-sm text-muted-foreground mt-[8px]">
        {flagCount} {flagCount === 1 ? "item" : "items"} flagged based on your profile
      </p>
    </div>
  );
};

export default RiskSummaryBadge;
