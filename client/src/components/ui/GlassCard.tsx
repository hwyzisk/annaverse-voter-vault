import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'light' | 'strong' | 'democrat' | 'republican' | 'independent' | 'success' | 'warning' | 'danger';
  hover?: boolean;
  float?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  hover = true,
  float = false
}: GlassCardProps) {
  const baseClasses = "glass-card";

  const variantClasses = {
    default: "glass",
    light: "glass-light",
    strong: "glass-strong",
    democrat: "glass-democrat",
    republican: "glass-republican",
    independent: "glass-independent",
    success: "glass-success",
    warning: "glass-warning",
    danger: "glass-danger"
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        hover && "hover:shadow-2xl hover:scale-[1.02]",
        float && "glass-float",
        className
      )}
    >
      {children}
    </div>
  );
}

interface GlassButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'democrat' | 'republican' | 'success' | 'danger';
}

export function GlassButton({
  children,
  className,
  onClick,
  disabled = false,
  variant = 'default'
}: GlassButtonProps) {
  const variantClasses = {
    default: "glass-button",
    democrat: "glass-button glass-democrat",
    republican: "glass-button glass-republican",
    success: "glass-button glass-success",
    danger: "glass-button glass-danger"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        variantClasses[variant],
        "transition-all duration-200",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

interface GlassModalProps {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
}

export function GlassModal({ children, className, isOpen }: GlassModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

      {/* Modal */}
      <div className={cn("glass-modal relative z-10 w-full max-w-2xl", className)}>
        {children}
      </div>
    </div>
  );
}

interface GlassBadgeProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'democrat' | 'republican' | 'independent' | 'success' | 'warning' | 'danger';
}

export function GlassBadge({ children, className, variant = 'default' }: GlassBadgeProps) {
  const variantClasses = {
    default: "glass-badge",
    democrat: "glass-badge glass-democrat",
    republican: "glass-badge glass-republican",
    independent: "glass-badge glass-independent",
    success: "glass-badge glass-success",
    warning: "glass-badge glass-warning",
    danger: "glass-badge glass-danger"
  };

  return (
    <span className={cn(variantClasses[variant], className)}>
      {children}
    </span>
  );
}

interface GlassProgressProps {
  value: number;
  max?: number;
  className?: string;
  showValue?: boolean;
}

export function GlassProgress({ value, max = 100, className, showValue = false }: GlassProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("glass-progress relative", className)}>
      <div
        className="glass-progress-fill"
        style={{ width: `${percentage}%` }}
      />
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/90">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}