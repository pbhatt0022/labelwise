import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/context/AppStateContext";

const riskDot = {
  low: "bg-risk-low",
  moderate: "bg-risk-moderate",
  high: "bg-risk-high",
};

const HistoryScreenDemo = () => {
  const navigate = useNavigate();
  const { history, selectScan } = useAppState();

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="px-[24px] pt-[48px] pb-[16px]">
        <h1 className="text-[24px] font-bold text-foreground">Scan History</h1>
        <p className="text-sm text-muted-foreground mt-[4px]">{history.length} products scanned</p>
      </div>

      <div className="px-[24px] space-y-[8px]">
        {history.length > 0 ? (
          history.map((item, i) => (
            <button
              key={item.id}
              onClick={() => {
                selectScan(item.id);
                navigate("/results");
              }}
              className="w-full bg-card rounded-xl p-[16px] shadow-card flex items-center gap-[16px] transition-all duration-200 hover:shadow-elevated active:scale-[0.98] animate-fade-in min-h-[44px]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-[40px] h-[40px] rounded-lg bg-secondary flex items-center justify-center text-sm font-semibold text-primary">
                {item.analysis.flags.length}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.brandName ? `${item.brandName} · ` : ""}
                  {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <span className={`w-[10px] h-[10px] rounded-full ${riskDot[item.analysis.overallRisk]}`} />
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-[20px]">
            <p className="text-sm font-semibold text-foreground">Your history is empty</p>
            <p className="mt-[6px] text-sm text-muted-foreground">
              Run one ingredient analysis and it will show up here for easy demo replay.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default HistoryScreenDemo;
