import { cn } from "@/lib/utils";

interface RiskFlagCardProps {
  icon: string;
  category: string;
  ingredient: string;
  explanation: string;
  suggestion?: string;
  risk: "low" | "moderate" | "high";
}

const riskConfig = {
  low: { bg: "bg-risk-low/10", border: "border-risk-low/30", dot: "bg-risk-low", label: "Low" },
  moderate: { bg: "bg-risk-moderate/10", border: "border-risk-moderate/30", dot: "bg-risk-moderate", label: "Moderate" },
  high: { bg: "bg-risk-high/10", border: "border-risk-high/30", dot: "bg-risk-high", label: "Worth checking" },
};

const RiskFlagCard = ({ icon, category, ingredient, explanation, suggestion, risk }: RiskFlagCardProps) => {
  const config = riskConfig[risk];
  return (
    <div className={cn("bg-card rounded-xl p-[16px] shadow-card border animate-fade-in", config.border)}>
      <div className="flex items-center gap-[8px] mb-[8px]">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-foreground">{category}</span>
        <div className="ml-auto flex items-center gap-[8px]">
          <span className={cn("w-[8px] h-[8px] rounded-full", config.dot)} />
          <span className="text-xs text-muted-foreground">{config.label}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-[4px]">{ingredient}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
      {suggestion && (
        <p className="text-xs text-muted-foreground mt-[8px] pt-[8px] border-t border-border italic">
          💡 {suggestion}
        </p>
      )}
    </div>
  );
};

export default RiskFlagCard;
