import { useLocation } from "wouter";
import { GlassButton } from "./GlassCard";
import { Sparkles } from "lucide-react";

interface GlassNavButtonProps {
  currentPath: string;
}

export function GlassNavButton({ currentPath }: GlassNavButtonProps) {
  const [, setLocation] = useLocation();

  // Only show on main app pages, not on the glassmorphism showcase itself
  if (currentPath === "/glassmorphism") {
    return (
      <div className="fixed top-4 right-4 z-50">
        <GlassButton
          onClick={() => setLocation("/")}
          className="px-4 py-2"
        >
          ← Back to App
        </GlassButton>
      </div>
    );
  }

  // Show glassmorphism showcase button on other pages
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <GlassButton
        variant="democrat"
        onClick={() => setLocation("/glassmorphism")}
        className="px-4 py-2 animate-pulse"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Glassmorphism Demo
      </GlassButton>
    </div>
  );
}