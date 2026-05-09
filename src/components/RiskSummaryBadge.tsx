import { cn } from "@/lib/utils";

interface RiskSummaryBadgeProps {
  level: "low" | "moderate" | "high";
  flagCount: number;
}

const config = {
  low: { bg: "bg-risk-low/15", text: "text-risk-low", label: "Good to know" },
  moderate: { bg: "bg-risk-moderate/15", text: "text-risk-moderate", label: "Worth reviewing" },
  high: { bg: "bg-risk-high/15", text: "text-risk-high", label: "Consider another product" },
};

const RiskSummaryBadge = ({ level, flagCount }: RiskSummaryBadgeProps) => {
  const current = config[level];

  return (
    <div className={cn("rounded-2xl p-[24px] text-center animate-scale-in", current.bg)}>
      <p className={cn("text-2xl font-bold", current.text)}>{current.label}</p>
      <p className="text-sm text-muted-foreground mt-[8px]">
        {flagCount === 0
          ? "No ingredients matched the concerns in your saved profile."
          : `${flagCount} ${flagCount === 1 ? "ingredient detail" : "ingredient details"} matched your saved profile`}
      </p>
    </div>
  );
};

export default RiskSummaryBadge;
