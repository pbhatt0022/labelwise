import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ChipSelector from "@/components/ChipSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/context/AppStateContext";
import { allergyOptions, dietOptions, sensitivityNotes, sensitivityOptions } from "@/data/profileOptions";
import { createCustomAvoid, getConcernIdsForLegacySelections } from "@/lib/analysis";
import type { AllergyOption, DietOption, SensitivityOption, UserCustomAvoid, UserProfile } from "@/lib/types";
import { ArrowRight, Plus, X } from "lucide-react";

const parseOptionalNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { profile, saveProfile } = useAppState();
  const [allergies, setAllergies] = useState<AllergyOption[]>(profile.allergies);
  const [diet, setDiet] = useState<DietOption[]>(profile.diet);
  const [sensitivities, setSensitivities] = useState<SensitivityOption[]>(profile.sensitivities);
  const [customAvoids, setCustomAvoids] = useState<UserCustomAvoid[]>(profile.customAvoids);
  const [dailySugarPreference, setDailySugarPreference] = useState(profile.dailySugarPreferenceG?.toString() ?? "");
  const [dailySodiumPreference, setDailySodiumPreference] = useState(profile.dailySodiumPreferenceMg?.toString() ?? "");
  const [dailySaturatedFatPreference, setDailySaturatedFatPreference] = useState(profile.dailySaturatedFatPreferenceG?.toString() ?? "");
  const [customAvoidInput, setCustomAvoidInput] = useState("");
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [expandedSensitivityNotes, setExpandedSensitivityNotes] = useState<Partial<Record<SensitivityOption, boolean>>>({});

  const toggle = <T extends string>(list: T[], setList: (value: T[]) => void, item: T) => {
    setList(list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]);
  };

  const sections = [
    {
      id: "allergies",
      kind: "chips" as const,
      title: "Any allergies?",
      subtitle: "We will flag these ingredients immediately during the scan.",
      options: allergyOptions,
      selected: allergies,
      set: setAllergies,
    },
    {
      id: "diet",
      kind: "chips" as const,
      title: "Diet preferences?",
      subtitle: "Choose any food-style preferences you want the app to respect.",
      options: dietOptions,
      selected: diet,
      set: setDiet,
    },
    {
      id: "sensitivities",
      kind: "chips" as const,
      title: "Sensitivities?",
      subtitle: "These help us highlight ingredients you prefer to avoid.",
      options: sensitivityOptions,
      selected: sensitivities,
      set: setSensitivities,
    },
    {
      id: "preferences",
      kind: "preferences" as const,
      title: "Optional food-label preferences",
      subtitle: "These are personal comparison points for labels, not diet rules. Leave any field blank if it is not useful to you.",
      options: [],
      selected: [],
      set: () => undefined,
    },
    {
      id: "custom",
      kind: "custom" as const,
      title: "Anything else to flag?",
      subtitle: "Add any ingredient or term you personally want highlighted.",
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
    setCustomAvoids((currentAvoids) =>
      currentAvoids.some((item) => item.normalizedTerm === nextAvoid.normalizedTerm) ? currentAvoids : [...currentAvoids, nextAvoid],
    );
    setCustomAvoidInput("");
  };

  const toggleSensitivityNote = (item: SensitivityOption) => {
    setExpandedSensitivityNotes((n) => ({ ...n, [item]: !n[item] }));
  };

  const handleSensitivityToggle = (item: SensitivityOption) => {
    const isSelected = sensitivities.includes(item);
    setSensitivities(isSelected ? sensitivities.filter((e) => e !== item) : [...sensitivities, item]);
    if (isSelected) {
      setExpandedSensitivityNotes((n) => { const next = { ...n }; delete next[item]; return next; });
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    const nextProfile: UserProfile = {
      allergies,
      health: [],
      diet,
      sensitivities,
      selectedConcernIds: getConcernIdsForLegacySelections({ allergies, health: [], diet, sensitivities }),
      customAvoids,
      dailySugarPreferenceG: parseOptionalNumber(dailySugarPreference),
      dailySodiumPreferenceMg: parseOptionalNumber(dailySodiumPreference),
      dailySaturatedFatPreferenceG: parseOptionalNumber(dailySaturatedFatPreference),
    };

    try {
      setIsSaving(true);
      setSaveError("");
      await saveProfile(nextProfile);
      navigate("/profile");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "We could not save your preferences just now.");
      setIsSaving(false);
    }
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

        {current.kind === "chips" ? (
          <>
            <ChipSelector
              options={current.options}
              selected={current.selected}
              onToggle={(label) =>
                current.id === "sensitivities"
                  ? handleSensitivityToggle(label as SensitivityOption)
                  : toggle(current.selected, current.set, label)
              }
            />

            {current.id === "sensitivities" && sensitivities.length > 0 && (
              <div className="mt-[16px] space-y-[10px]">
                {sensitivities.map((item) => {
                  const note = sensitivityNotes[item];
                  const expanded = expandedSensitivityNotes[item] ?? false;
                  return (
                    <div key={item} className="rounded-2xl border border-border bg-secondary/35 p-[14px]">
                      <p className="text-sm font-semibold text-foreground">{note.title}</p>
                      <p className="mt-[4px] text-sm leading-relaxed text-muted-foreground">{note.summary}</p>
                      <button
                        type="button"
                        onClick={() => toggleSensitivityNote(item)}
                        className="mt-[8px] text-xs font-medium text-accent"
                      >
                        {expanded ? "Hide details" : "Details"}
                      </button>
                      {expanded && (
                        <div className="mt-[10px] space-y-[10px]">
                          <p className="text-sm leading-relaxed text-muted-foreground">{note.detail}</p>
                          {note.citations.length > 0 && (
                            <div>
                              <p className="mb-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                                Sources
                              </p>
                              <div className="space-y-[4px]">
                                {note.citations.map((citation) => (
                                  <p key={citation.label} className="text-sm">
                                    <a
                                      href={citation.href}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary underline-offset-2 hover:underline"
                                    >
                                      {citation.label}
                                    </a>
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : current.kind === "preferences" ? (
          <div className="space-y-[16px]">
            <div className="grid gap-[12px] sm:grid-cols-2">
              <label className="text-sm text-muted-foreground">
                Daily sugar preference (g)
                <Input
                  className="mt-[6px]"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={dailySugarPreference}
                  placeholder="e.g. 10"
                  onChange={(event) => setDailySugarPreference(event.target.value)}
                />
              </label>
              <label className="text-sm text-muted-foreground">
                Daily sodium preference (mg)
                <Input
                  className="mt-[6px]"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={dailySodiumPreference}
                  placeholder="e.g. 1500"
                  onChange={(event) => setDailySodiumPreference(event.target.value)}
                />
              </label>
            </div>

            <label className="block text-sm text-muted-foreground">
              Daily saturated fat preference (g)
              <Input
                className="mt-[6px]"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={dailySaturatedFatPreference}
                placeholder="e.g. 10"
                onChange={(event) => setDailySaturatedFatPreference(event.target.value)}
              />
            </label>

            <div className="rounded-2xl bg-secondary/45 p-[14px] text-sm text-muted-foreground">
              LabelWise uses these only as optional comparison points while reading a label. They do not create diet rules, and they are not medical advice.
            </div>
          </div>
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
                    <button type="button" onClick={() => setCustomAvoids((currentAvoids) => currentAvoids.filter((item) => item.id !== avoid.id))}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No custom ingredients yet. Add anything you personally want highlighted in results.</p>
            )}
          </div>
        )}
      </div>

      {saveError && (
        <div className="mt-[12px] rounded-2xl border border-border bg-secondary/35 p-[14px] text-sm text-muted-foreground">
          {saveError}
        </div>
      )}

      <div className="flex gap-[8px] mt-[24px]">
        {step > 0 && (
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(step - 1)} disabled={isSaving}>
            Back
          </Button>
        )}
        <Button
          variant="lime"
          size="lg"
          className="flex-1"
          disabled={isSaving}
          onClick={() => (step < sections.length - 1 ? setStep(step + 1) : handleSave())}
        >
          {step < sections.length - 1 ? "Continue" : isSaving ? "Saving..." : "Save Preferences"} <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
};

export default ProfileSetup;
