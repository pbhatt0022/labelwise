import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { AppStateProvider } from "@/context/AppStateContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import BottomNav from "./components/BottomNav";
import Onboarding from "./pages/Onboarding";
import AuthScreen from "./pages/AuthScreen";
import ProfileSetup from "./pages/ProfileSetup";
import HomeScreen from "./pages/HomeScreen";
import ScanScreen from "./pages/ScanScreen";
import ResultsScreen from "./pages/ResultsScreen";
import ProfileScreen from "./pages/ProfileScreen";
import HistoryScreen from "./pages/HistoryScreen";
import NotFound from "./pages/NotFound";
import { useAppState } from "./context/AppStateContext";

const NAV_ROUTES = new Set(["/home", "/scan", "/results", "/profile", "/history"]);

const PersistentNav = () => {
  const location = useLocation();
  return NAV_ROUTES.has(location.pathname) ? <BottomNav /> : null;
};

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated } = useAppState();
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/profile-setup" element={<RequireAuth><ProfileSetup /></RequireAuth>} />
        <Route path="/home" element={<RequireAuth><HomeScreen /></RequireAuth>} />
        <Route path="/scan" element={<RequireAuth><ScanScreen /></RequireAuth>} />
        <Route path="/results" element={<RequireAuth><ResultsScreen /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfileScreen /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><HistoryScreen /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppStateProvider>
      <TooltipProvider>
        <AppErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatedRoutes />
            <PersistentNav />
          </BrowserRouter>
        </AppErrorBoundary>
      </TooltipProvider>
    </AppStateProvider>
  </QueryClientProvider>
);

export default App;
