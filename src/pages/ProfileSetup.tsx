import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChipSelector from "@/components/ChipSelector";
import { useAppState } from "@/context/AppStateContext";
import { allergyOptions, dietOptions, healthOptions, sensitivityOptions } from "@/data/profileOptions";
import { createCustomAvoid, getConcernIdsForLegacySelections } from "@/lib/analysis";
import type { AllergyOption, DietOption, HealthOption, SensitivityOption, UserCustomAvoid, UserProfile } from "@/lib/types";
import { ArrowRight, Plus, X } from "lucide-react";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { profile, saveProfile } = useAppState();
  const [allergies, setAllergies] = useState<AllergyOption[]>(profile.allergies);
  const [health, setHealth] = useState<HealthOption[]>(profile.health);
  const [diet, setDiet] = useState<DietOption[]>(profile.diet);
  const [sensitivities, setSensitivities] = useState<SensitivityOption[]>(profile.sensitivities);
  const [customAvoids, setCustomAvoids] = useState<UserCustomAvoid[]>(profile.customAvoids);
  const [customAvoidInput, setCustomAvoidInput] = useState("");
  const [step, setStep] = useState(0);

  const toggle = <T extends string>(list: T[], setList: (value: T[]) => void, item: T) => {
    setList(list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]);
  };

  const sections = [
    {
      title: "Any allergies?",
      subtitle: "We will flag these ingredients immediately during the scan.",
      options: allergyOptions,
      selected: allergies,
      set: setAllergies,
    },
    {
      title: "Health concerns?",
      subtitle: "Optional, but useful for showing why certain additives matter.",
      options: healthOptions,
      selected: health,
      set: setHealth,
    },
    {
      title: "Diet preferences?",
      subtitle: "Choose any food-style preferences you want the app to respect.",
      options: dietOptions,
      selected: diet,
      set: setDiet,
    },
    {
      title: "Sensitivities?",
      subtitle: "These help us highlight ingredients you prefer to avoid.",
      options: sensitivityOptions,
      selected: sensitivities,
      set: setSensitivities,
    },
    {
      title: "Anything else to flag?",
      subtitle: "Add any ingredient or term you personally want highlighted, like soy sauce or carrageenan.",
      options: [],
      selected: [],
      set: () => undefined,
    },
  ];

  const current = sections[step];

  const addCustomAvoid = () => {
    const trimmed = customAvoidInput.trim();
    if (!trimmed) return;

    const nextAvoid = createCustomAvoid(trimmed);
    setCustomAvoids((current) =>
      current.some((item) => item.normalizedTerm === nextAvoid.normalizedTerm) ? current : [...current, nextAvoid],
    );
    setCustomAvoidInput("");
  };

  const handleSave = async () => {
    const nextProfile: UserProfile = {
      allergies,
      health,
      diet,
      sensitivities,
      selectedConcernIds: getConcernIdsForLegacySelections({ allergies, health, diet, sensitivities }),
      customAvoids,
    };

    await saveProfile(nextProfile);
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-[24px] pt-[48px] pb-[24px]">
      <div className="flex gap-[4px] mb-[32px]">
        {sections.map((_, i) => (
          <div key={i} className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>

      <div className="flex-1 animate-fade-in" key={step}>
        <h2 className="text-[24px] font-bold text-foreground mb-[8px]">{current.title}</h2>
        <p className="text-sm text-muted-foreground mb-[24px]">{current.subtitle}</p>
        {step < sections.length - 1 ? (
          <ChipSelector
            options={current.options}
            selected={current.selected}
            onToggle={(label) => toggle(current.selected, current.set, label)}
          />
        ) : (
          <div className="space-y-[16px]">
            <div className="flex gap-[8px]">
              <Input
                value={customAvoidInput}
                placeholder="Type an ingredient to flag"
                onChange={(event) => setCustomAvoidInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomAvoid();
                  }
                }}
              />
              <Button variant="lime" size="icon" onClick={addCustomAvoid} type="button">
                <Plus size={18} />
              </Button>
            </div>

            {customAvoids.length > 0 ? (
              <div className="flex flex-wrap gap-[8px]">
                {customAvoids.map((avoid) => (
                  <span key={avoid.id} className="inline-flex items-center gap-[8px] rounded-full bg-primary/10 px-[12px] py-[8px] text-sm font-medium text-primary">
                    {avoid.label}
                    <button type="button" onClick={() => setCustomAvoids((current) => current.filter((item) => item.id !== avoid.id))}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No custom ingredients yet. Add anything you personally want flagged in results.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        {step > 0 && (
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button
          variant="lime"
          size="lg"
          className="flex-1"
          onClick={() => (step < sections.length - 1 ? setStep(step + 1) : handleSave())}
        >
          {step < sections.length - 1 ? "Continue" : "Save Preferences"} <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
};

export default ProfileSetup;
