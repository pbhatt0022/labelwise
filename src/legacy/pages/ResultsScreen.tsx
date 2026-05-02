import { useNavigate } from "react-router-dom";
import RiskSummaryBadge from "@/components/RiskSummaryBadge";
import RiskFlagCard from "@/components/RiskFlagCard";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Share2 } from "lucide-react";

const mockFlags = [
  {
    icon: "🥛",
    category: "Allergen",
    ingredient: "Whey Protein Concentrate",
    explanation: "Contains whey (milk protein), which you marked as an allergy.",
    suggestion: "Look for plant-based protein alternatives.",
    risk: "high" as const,
  },
  {
    icon: "🍬",
    category: "Added Sugar",
    ingredient: "High Fructose Corn Syrup",
    explanation: "A common sweetener that may concern those managing blood sugar levels.",
    suggestion: "Consider options sweetened with stevia or monk fruit.",
    risk: "moderate" as const,
  },
  {
    icon: "🧪",
    category: "Preservative",
    ingredient: "Sodium Benzoate",
    explanation: "A preservative you've flagged as a sensitivity. Generally recognized as safe in small amounts.",
    risk: "low" as const,
  },
];

const ResultsScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      {/* Header */}
      <div className="bg-primary px-[24px] pt-[48px] pb-[24px] rounded-b-2xl">
        <div className="flex items-center justify-between mb-[16px]">
          <button
            onClick={() => navigate(-1)}
            className="w-[44px] h-[44px] rounded-full bg-primary-foreground/10 flex items-center justify-center"
          >
            <ArrowLeft size={20} className="text-primary-foreground" />
          </button>
          <button className="w-[44px] h-[44px] rounded-full bg-primary-foreground/10 flex items-center justify-center">
            <Share2 size={18} className="text-primary-foreground" />
          </button>
        </div>
        <h1 className="text-[20px] font-bold text-primary-foreground">Protein Bar</h1>
        <p className="text-sm text-primary-foreground/60">Kind · Scanned just now</p>
      </div>

      <div className="px-[24px] mt-[24px] space-y-[16px]">
        {/* Risk Summary */}
        <RiskSummaryBadge level="moderate" flagCount={3} />

        {/* Flag Cards */}
        <div className="space-y-[8px]">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Flagged for you
          </h3>
          {mockFlags.map((flag, i) => (
            <RiskFlagCard key={i} {...flag} />
          ))}
        </div>

        {/* Full ingredients */}
        <div className="bg-card rounded-xl p-[16px] shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-[8px]">All Ingredients</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Oats, Sugar, High Fructose Corn Syrup, Whey Protein Concentrate, Palm Kernel Oil, 
            Soy Lecithin, Sodium Benzoate, Natural Flavors, Vitamin E (Mixed Tocopherols).
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ResultsScreen;
