import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { ScanLine, Clock, Leaf } from "lucide-react";

const HomeScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      {/* Header */}
      <div className="bg-primary px-[24px] pt-[48px] pb-[32px] rounded-b-2xl">
        <div className="flex items-center gap-[8px] mb-[4px]">
          <Leaf size={20} className="text-accent" />
          <span className="text-sm font-semibold text-primary-foreground/70">NutriScan</span>
        </div>
        <h1 className="text-[24px] font-bold text-primary-foreground">Good morning 👋</h1>
        <p className="text-sm text-primary-foreground/60 mt-[4px]">What are you eating today?</p>
      </div>

      {/* Main CTA */}
      <div className="px-[24px] -mt-[24px]">
        <button
          onClick={() => navigate("/scan")}
          className="w-full bg-card rounded-2xl shadow-elevated p-[24px] flex items-center gap-[16px] transition-all duration-200 hover:shadow-card active:scale-[0.98]"
        >
          <div className="w-[56px] h-[56px] rounded-xl bg-accent/15 flex items-center justify-center">
            <ScanLine size={28} className="text-accent" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-foreground">Scan Food Label</p>
            <p className="text-sm text-muted-foreground">Point your camera at any label</p>
          </div>
        </button>
      </div>

      {/* Recent Scans */}
      <div className="px-[24px] mt-[32px]">
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-lg font-semibold text-foreground">Recent Scans</h2>
          <button onClick={() => navigate("/history")} className="text-sm text-accent font-medium">
            See all
          </button>
        </div>

        {/* Mock recent items */}
        {[
          { name: "Oat Milk Vanilla", brand: "Oatly", risk: "low" as const, time: "2h ago" },
          { name: "Protein Bar", brand: "Kind", risk: "moderate" as const, time: "Yesterday" },
          { name: "Instant Noodles", brand: "Maggi", risk: "high" as const, time: "2 days ago" },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => navigate("/results")}
            className="w-full bg-card rounded-xl p-[16px] shadow-card mb-[8px] flex items-center gap-[16px] transition-all duration-200 hover:shadow-elevated active:scale-[0.98] animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="w-[40px] h-[40px] rounded-lg bg-secondary flex items-center justify-center text-lg">
              🏷️
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.brand} · {item.time}</p>
            </div>
            <span
              className={`w-[10px] h-[10px] rounded-full ${
                item.risk === "low" ? "bg-risk-low" : item.risk === "moderate" ? "bg-risk-moderate" : "bg-risk-high"
              }`}
            />
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default HomeScreen;
