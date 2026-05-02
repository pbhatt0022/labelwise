import { Home, Clock, User, ScanLine } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: ScanLine, label: "Scan", path: "/scan" },
  { icon: Clock, label: "Saved", path: "/history" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-[8px] pb-[8px] pt-[4px] z-50">
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-[4px] py-[8px] px-[16px] rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px]",
                active ? "text-accent" : "text-muted-foreground"
              )}
            >
              <tab.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
