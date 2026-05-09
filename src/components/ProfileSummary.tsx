import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

const sections = [
  { key: "allergies", label: "Allergies" },
  { key: "diet", label: "Diet" },
  { key: "sensitivities", label: "Sensitivities" },
  { key: "customAvoids", label: "Custom Avoids" },
] as const;

interface ProfileSummaryProps {
  profile: UserProfile;
  compact?: boolean;
}

const ProfileSummary = ({ profile, compact = false }: ProfileSummaryProps) => {
  const preferenceItems = [
    typeof profile.dailySugarPreferenceG === "number" ? `Sugar: ${profile.dailySugarPreferenceG}g/day` : undefined,
    typeof profile.dailySodiumPreferenceMg === "number" ? `Sodium: ${profile.dailySodiumPreferenceMg}mg/day` : undefined,
    typeof profile.dailySaturatedFatPreferenceG === "number" ? `Saturated fat: ${profile.dailySaturatedFatPreferenceG}g/day` : undefined,
  ].filter(Boolean) as string[];

  return (
    <div className={cn("space-y-[12px]", compact && "space-y-[8px]")}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Label Preferences</p>
        {preferenceItems.length > 0 ? (
          <div className="mt-[8px] flex flex-wrap gap-[8px]">
            {preferenceItems.map((item) => (
              <span
                key={item}
                className={cn(
                  "rounded-full bg-accent/15 px-[12px] py-[6px] text-xs font-medium text-foreground",
                  compact && "px-[10px] py-[5px]",
                )}
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-[6px] text-sm text-muted-foreground">No optional nutrition preferences saved</p>
        )}
      </div>

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
