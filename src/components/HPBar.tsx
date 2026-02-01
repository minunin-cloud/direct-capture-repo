import { cn } from "@/lib/utils";

interface HPBarProps {
  value: number;
  max?: number;
  label: string;
  variant?: "player" | "enemy";
  className?: string;
}

export function HPBar({ 
  value, 
  max = 100, 
  label, 
  variant = "player",
  className 
}: HPBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const getColorClass = () => {
    if (variant === "enemy") {
      return "bg-destructive";
    }
    if (percentage <= 30) return "bg-destructive";
    if (percentage <= 60) return "bg-warning";
    return "bg-success";
  };

  const getGlowClass = () => {
    if (variant === "enemy") {
      return "shadow-[0_0_10px_hsl(var(--destructive)/0.5)]";
    }
    if (percentage <= 30) return "shadow-[0_0_10px_hsl(var(--destructive)/0.5)]";
    if (percentage <= 60) return "shadow-[0_0_10px_hsl(var(--warning)/0.5)]";
    return "shadow-[0_0_10px_hsl(var(--success)/0.5)]";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-mono font-bold">
          {value.toFixed(0)}%
        </span>
      </div>
      <div className="relative h-4 bg-secondary rounded-full overflow-hidden border border-border">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
            getColorClass(),
            getGlowClass()
          )}
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
        
        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between px-1">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i} 
              className="w-px h-full bg-background/30"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
