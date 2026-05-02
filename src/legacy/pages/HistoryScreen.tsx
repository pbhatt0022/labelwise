import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const historyItems = [
  { name: "Oat Milk Vanilla", brand: "Oatly", risk: "low" as const, date: "Mar 7, 2026" },
  { name: "Protein Bar", brand: "Kind", risk: "moderate" as const, date: "Mar 6, 2026" },
  { name: "Instant Noodles", brand: "Maggi", risk: "high" as const, date: "Mar 5, 2026" },
  { name: "Greek Yogurt", brand: "Chobani", risk: "low" as const, date: "Mar 4, 2026" },
  { name: "Granola Cereal", brand: "Nature Valley", risk: "moderate" as const, date: "Mar 3, 2026" },
];

const riskDot = {
  low: "bg-risk-low",
  moderate: "bg-risk-moderate",
  high: "bg-risk-high",
};

const HistoryScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="px-[24px] pt-[48px] pb-[16px]">
        <h1 className="text-[24px] font-bold text-foreground">Scan History</h1>
        <p className="text-sm text-muted-foreground mt-[4px]">{historyItems.length} products scanned</p>
      </div>

      <div className="px-[24px] space-y-[8px]">
        {historyItems.map((item, i) => (
          <button
            key={i}
            onClick={() => navigate("/results")}
            className="w-full bg-card rounded-xl p-[16px] shadow-card flex items-center gap-[16px] transition-all duration-200 hover:shadow-elevated active:scale-[0.98] animate-fade-in min-h-[44px]"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="w-[40px] h-[40px] rounded-lg bg-secondary flex items-center justify-center text-lg">
              🏷️
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.brand} · {item.date}</p>
            </div>
            <span className={`w-[10px] h-[10px] rounded-full ${riskDot[item.risk]}`} />
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default HistoryScreen;
