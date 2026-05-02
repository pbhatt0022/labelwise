import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

const sections = [
  { key: "allergies", label: "Allergies" },
  { key: "health", label: "Health" },
  { key: "diet", label: "Diet" },
  { key: "sensitivities", label: "Sensitivities" },
  { key: "customAvoids", label: "Custom Avoids" },
] as const;

interface ProfileSummaryProps {
  profile: UserProfile;
  compact?: boolean;
}

const ProfileSummary = ({ profile, compact = false }: ProfileSummaryProps) => {
  return (
    <div className={cn("space-y-[12px]", compact && "space-y-[8px]")}>
      {sections.map((section) => {
        const items = section.key === "customAvoids" ? profile.customAvoids.map((item) => item.label) : profile[section.key];

        return (
          <div key={section.key}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {section.label}
            </p>
            {items.length > 0 ? (
              <div className="mt-[8px] flex flex-wrap gap-[8px]">
                {items.map((item) => (
                  <span
                    key={item}
                    className={cn(
                      "rounded-full bg-primary/10 px-[12px] py-[6px] text-xs font-medium text-primary",
                      compact && "px-[10px] py-[5px]",
                    )}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-[6px] text-sm text-muted-foreground">None selected</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProfileSummary;
