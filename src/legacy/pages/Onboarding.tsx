import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowRight } from "lucide-react";

const slides = [
  {
    icon: "🌿",
    title: "Understand what's really in your food.",
    description: "Scan any packaged food label and get clear, personalized insights instantly.",
  },
  {
    icon: "🔍",
    title: "Tailored to you.",
    description: "Set your allergies, diet, and health concerns — we'll flag what matters to you.",
  },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-[24px]">
      <div className="w-full max-w-sm animate-fade-in" key={step}>
        <div className="text-center mb-[40px]">
          <div className="w-[80px] h-[80px] rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-[24px]">
            <span className="text-4xl">{slides[step].icon}</span>
          </div>
          <h1 className="text-[28px] font-bold text-primary-foreground leading-tight mb-[16px]">
            {slides[step].title}
          </h1>
          <p className="text-base text-primary-foreground/70 leading-relaxed">
            {slides[step].description}
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
          <Button variant="lime" size="lg" className="w-full" onClick={() => navigate("/profile-setup")}>
            Get Started <Leaf size={18} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
