import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/context/AppStateContext";
import { hasProfileSelections } from "@/lib/analysis";
import { Leaf, ArrowRight, BrainCircuit, ScanSearch } from "lucide-react";

const slides = [
  {
    title: "Understand what the full label is really saying.",
    description: "Scan packaged labels and turn technical ingredients into clearer, more personal explanations at the moment you are deciding.",
  },
  {
    title: "Built on health psychology, not just OCR.",
    description: "LabelWise reduces label-reading effort, supports reflective choices, and keeps the focus on food-label literacy rather than calorie tracking or dieting.",
  },
  {
    title: "Save what works for you.",
    description: "Create an account, keep your profile, and organize useful label checks into folders for grocery planning or later review.",
  },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { isAuthenticated, isRemoteDataLoading, profile } = useAppState();
  const profileReady = hasProfileSelections(profile);

  useEffect(() => {
    if (isAuthenticated && !isRemoteDataLoading) {
      navigate(profileReady ? "/home" : "/profile-setup", { replace: true });
    }
  }, [isAuthenticated, isRemoteDataLoading, navigate, profileReady]);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-[24px]">
      <div className="w-full max-w-sm animate-fade-in" key={step}>
        <div className="text-center mb-[40px]">
          <div className="w-[80px] h-[80px] rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-[24px]">
            {step === 0 ? <Leaf size={36} className="text-accent" /> : step === 1 ? <BrainCircuit size={36} className="text-accent" /> : <ScanSearch size={36} className="text-accent" />}
          </div>
          <h1 className="text-[28px] font-bold text-primary-foreground leading-tight mb-[16px]">
            {slides[step].title}
          </h1>
          <p className="text-base text-primary-foreground/70 leading-relaxed">{slides[step].description}</p>
          <p className="mt-[12px] text-xs text-primary-foreground/60">
            Educational guidance only. LabelWise does not diagnose, prescribe diets, or give medical advice.
          </p>
        </div>

        <div className="flex justify-center gap-[8px] mb-[32px]">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-[4px] rounded-full transition-all duration-300 ${
                i === step ? "w-[24px] bg-accent" : "w-[8px] bg-primary-foreground/20"
              }`}
            />
          ))}
        </div>

        {step < slides.length - 1 ? (
          <Button variant="lime" size="lg" className="w-full" onClick={() => setStep(step + 1)}>
            Next <ArrowRight size={18} />
          </Button>
        ) : (
          <Button variant="lime" size="lg" className="w-full" onClick={() => navigate("/auth")}>
            Create My Account <Leaf size={18} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
