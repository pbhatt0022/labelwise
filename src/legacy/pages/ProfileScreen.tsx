import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, ChevronRight, LogOut, Bell, Shield } from "lucide-react";

const profileChips = [
  { category: "Allergies", items: ["Milk", "Nuts"] },
  { category: "Health", items: ["Diabetes"] },
  { category: "Diet", items: ["Low Sodium"] },
  { category: "Sensitivities", items: ["MSG", "Preservatives"] },
];

const ProfileScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="bg-primary px-[24px] pt-[48px] pb-[32px] rounded-b-2xl">
        <div className="flex items-center gap-[16px]">
          <div className="w-[56px] h-[56px] rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-2xl">🌿</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Your Profile</h1>
            <p className="text-sm text-primary-foreground/60">Personalized settings</p>
          </div>
        </div>
      </div>

      <div className="px-[24px] mt-[24px] space-y-[16px]">
        {profileChips.map((section, i) => (
          <div key={i} className="bg-card rounded-xl p-[16px] shadow-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-[8px]">
              {section.category}
            </p>
            <div className="flex flex-wrap gap-[8px]">
              {section.items.map((item) => (
                <span key={item} className="px-[12px] py-[6px] rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-[4px] mt-[16px]">
          {[
            { icon: Bell, label: "Notifications" },
            { icon: Shield, label: "Privacy" },
            { icon: LogOut, label: "Sign Out" },
          ].map((item, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-[16px] bg-card rounded-xl p-[16px] shadow-card transition-all hover:shadow-elevated min-h-[44px]"
            >
              <item.icon size={20} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
