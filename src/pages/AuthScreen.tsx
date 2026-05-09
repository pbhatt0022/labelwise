import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/context/AppStateContext";
import { hasProfileSelections } from "@/lib/analysis";
import { ArrowRight, KeyRound, Leaf, LogIn, UserPlus } from "lucide-react";

const AuthScreen = () => {
  const navigate = useNavigate();
  const { backendMode, isAuthenticated, profile, signIn, signUp } = useAppState();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(hasProfileSelections(profile) ? "/home" : "/profile-setup", { replace: true });
    }
  }, [isAuthenticated, navigate, profile]);

  const handleSubmit = async () => {
    const result =
      mode === "signup" ? signUp(email, password, displayName) : signIn(email, password);
    const resolved = await result;

    if (!resolved.ok) {
      setError(resolved.error ?? "We could not complete that request.");
      setInfo("");
    } else {
      setError("");
      setInfo(resolved.info ?? "");
    }
  };

  return (
    <div className="min-h-screen bg-primary px-[24px] py-[32px]">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center">
        <div className="rounded-[32px] border border-primary-foreground/10 bg-primary-foreground/5 p-[24px] shadow-elevated">
          <div className="mb-[24px] text-center">
            <div className="mx-auto mb-[16px] flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent/20">
              <Leaf size={32} className="text-accent" />
            </div>
            <h1 className="text-[28px] font-bold text-primary-foreground">LabelWise</h1>
            <p className="mt-[8px] text-sm leading-relaxed text-primary-foreground/70">
                A facts-first, psychology-informed food-label literacy coach that helps you read ingredients and nutrition context without turning the experience into calorie tracking.
            </p>
          </div>

          <div className="mb-[20px] grid grid-cols-2 gap-[8px] rounded-full bg-primary-foreground/10 p-[4px]">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-full px-[16px] py-[10px] text-sm font-semibold transition ${mode === "signup" ? "bg-accent text-accent-foreground" : "text-primary-foreground/70"}`}
            >
              <span className="inline-flex items-center gap-[6px]">
                <UserPlus size={14} /> Sign up
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-full px-[16px] py-[10px] text-sm font-semibold transition ${mode === "signin" ? "bg-accent text-accent-foreground" : "text-primary-foreground/70"}`}
            >
              <span className="inline-flex items-center gap-[6px]">
                <LogIn size={14} /> Log in
              </span>
            </button>
          </div>

          <div className="space-y-[14px]">
            {mode === "signup" && (
              <div>
                <label className="mb-[8px] block text-sm font-medium text-primary-foreground">Name</label>
                <Input value={displayName} placeholder="How should we address you?" onChange={(event) => setDisplayName(event.target.value)} />
              </div>
            )}
            <div>
              <label className="mb-[8px] block text-sm font-medium text-primary-foreground">Email</label>
              <Input value={email} type="email" placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <label className="mb-[8px] block text-sm font-medium text-primary-foreground">Password</label>
              <Input value={password} type="password" placeholder="Create a simple password" onChange={(event) => setPassword(event.target.value)} />
            </div>
          </div>

          {error && <p className="mt-[14px] text-sm text-primary-foreground">{error}</p>}
          {!error && info && <p className="mt-[14px] text-sm text-primary-foreground">{info}</p>}

          <Button variant="lime" size="lg" className="mt-[20px] w-full" onClick={handleSubmit}>
            {mode === "signup" ? "Create account" : "Log in"} <ArrowRight size={18} />
          </Button>

          <div className="mt-[18px] rounded-2xl bg-primary-foreground/10 p-[14px] text-sm text-primary-foreground/80">
            <div className="mb-[6px] inline-flex items-center gap-[8px] font-semibold">
              <KeyRound size={16} /> Why create an account?
            </div>
            <p>
              Your preferences, saved scans, custom folders, favorites, and reflections stay linked to your personal LabelWise workspace.
            </p>
            <p className="mt-[8px] text-xs text-primary-foreground/70">
              Backend mode: {backendMode === "supabase" ? "Supabase hosted auth + database" : "Local fallback until Supabase keys are configured"}
            </p>
            <p className="mt-[8px] text-xs text-primary-foreground/70">
              Educational guidance only. LabelWise does not diagnose conditions, prescribe diets, or give medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
