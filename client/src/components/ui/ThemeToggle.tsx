import { Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  variant?: 'default' | 'minimal';
}

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light mode', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark mode', icon: <Moon className="h-4 w-4" /> },
    { value: 'glass', label: 'Party mode', icon: <Sparkles className="h-4 w-4" /> },
  ];

  const currentTheme = themes.find(t => t.value === theme);

  if (variant === 'minimal') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start px-2 py-2 h-auto text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {currentTheme?.icon}
            <span className="ml-3">{currentTheme?.label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={theme === 'glass' ? 'glass-card' : ''}>
          {themes.map((themeOption) => (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={`flex items-center gap-2 ${theme === themeOption.value ? 'bg-accent' : ''}`}
            >
              {themeOption.icon}
              {themeOption.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={theme === 'glass' ? 'glass-button' : ''}
        >
          {currentTheme?.icon}
          <span className="ml-2">{currentTheme?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={theme === 'glass' ? 'glass-card' : ''}>
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`flex items-center gap-2 ${theme === themeOption.value ? 'bg-accent' : ''}`}
          >
            {themeOption.icon}
            {themeOption.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}