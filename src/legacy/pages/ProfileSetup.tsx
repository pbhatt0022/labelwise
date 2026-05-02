import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ChipSelector from "@/components/ChipSelector";
import { ArrowRight } from "lucide-react";

const allergyOptions = [
  { label: "Milk", icon: "🥛" },
  { label: "Gluten", icon: "🌾" },
  { label: "Nuts", icon: "🥜" },
  { label: "Soy", icon: "🫘" },
  { label: "Eggs", icon: "🥚" },
  { label: "Shellfish", icon: "🦐" },
];

const healthOptions = [
  { label: "Diabetes", icon: "🩸" },
  { label: "High BP", icon: "❤️" },
  { label: "Cholesterol", icon: "🫀" },
];

const dietOptions = [
  { label: "Vegan", icon: "🌱" },
  { label: "Vegetarian", icon: "🥗" },
  { label: "Low Sodium", icon: "🧂" },
  { label: "Keto", icon: "🥑" },
];

const sensitivityOptions = [
  { label: "MSG", icon: "⚗️" },
  { label: "Artificial Sweeteners", icon: "🍬" },
  { label: "Preservatives", icon: "🧪" },
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [health, setHealth] = useState<string[]>([]);
  const [diet, setDiet] = useState<string[]>([]);
  const [sensitivities, setSensitivities] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const sections = [
    { title: "Any allergies?", subtitle: "We'll flag these ingredients for you.", options: allergyOptions, selected: allergies, set: setAllergies },
    { title: "Health concerns?", subtitle: "Optional — helps us personalize results.", options: healthOptions, selected: health, set: setHealth },
    { title: "Diet preferences?", subtitle: "Select any that apply.", options: dietOptions, selected: diet, set: setDiet },
    { title: "Sensitivities?", subtitle: "Things you'd prefer to avoid.", options: sensitivityOptions, selected: sensitivities, set: setSensitivities },
  ];

  const current = sections[step];

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
        <ChipSelector
          options={current.options}
          selected={current.selected}
          onToggle={(label) => toggle(current.selected, current.set, label)}
        />
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
          onClick={() => (step < sections.length - 1 ? setStep(step + 1) : navigate("/home"))}
        >
          {step < sections.length - 1 ? "Continue" : "Done"} <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
};

export default ProfileSetup;
