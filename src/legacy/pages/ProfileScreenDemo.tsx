import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ProfileSummary from "@/components/ProfileSummary";
import { useAppState } from "@/context/AppStateContext";
import { ChevronRight, Bell, Shield, SlidersHorizontal } from "lucide-react";

const ProfileScreenDemo = () => {
  const navigate = useNavigate();
  const { profile } = useAppState();

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="bg-primary px-[24px] pt-[48px] pb-[32px] rounded-b-2xl">
        <div className="flex items-center gap-[16px]">
          <div className="w-[56px] h-[56px] rounded-full bg-accent/20 flex items-center justify-center">
            <SlidersHorizontal size={24} className="text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Your Profile</h1>
            <p className="text-sm text-primary-foreground/60">Personalized settings for every scan</p>
          </div>
        </div>
      </div>

      <div className="px-[24px] mt-[24px] space-y-[16px]">
        <div className="bg-card rounded-xl p-[16px] shadow-card animate-fade-in">
          <div className="mb-[12px] flex items-center justify-between gap-[12px]">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active preferences</p>
              <p className="mt-[4px] text-sm text-muted-foreground">These settings decide what gets flagged.</p>
            </div>
            <button onClick={() => navigate("/profile-setup")} className="text-sm font-medium text-accent">
              Edit
            </button>
          </div>
          <ProfileSummary profile={profile} />
        </div>

        <div className="space-y-[4px] mt-[16px]">
          {[
            { icon: Bell, label: "Notifications" },
            { icon: Shield, label: "Privacy" },
            { icon: SlidersHorizontal, label: "Scanner preferences" },
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

export default ProfileScreenDemo;
