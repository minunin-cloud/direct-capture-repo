import { cn } from "@/lib/utils";
import { 
  Circle, 
  Search, 
  MoveRight, 
  Swords, 
  Package, 
  Heart, 
  Wind,
  Zap
} from "lucide-react";

type CombatState = 
  | "idle" 
  | "searching" 
  | "approaching" 
  | "combat" 
  | "looting" 
  | "healing" 
  | "kiting" 
  | "aoe";

interface CombatStateDisplayProps {
  currentState: CombatState;
  className?: string;
}

const stateConfig: Record<CombatState, { 
  icon: typeof Circle; 
  label: string; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  idle: {
    icon: Circle,
    label: "IDLE",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    description: "Waiting for input",
  },
  searching: {
    icon: Search,
    label: "SEARCHING",
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "Looking for targets",
  },
  approaching: {
    icon: MoveRight,
    label: "APPROACHING",
    color: "text-warning",
    bgColor: "bg-warning/10",
    description: "Moving to target",
  },
  combat: {
    icon: Swords,
    label: "COMBAT",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    description: "Engaging enemy",
  },
  looting: {
    icon: Package,
    label: "LOOTING",
    color: "text-success",
    bgColor: "bg-success/10",
    description: "Collecting loot",
  },
  healing: {
    icon: Heart,
    label: "HEALING",
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    description: "Recovering HP",
  },
  kiting: {
    icon: Wind,
    label: "KITING",
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    description: "Maintaining distance",
  },
  aoe: {
    icon: Zap,
    label: "AOE",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    description: "Area attack mode",
  },
};

const states: CombatState[] = [
  "idle",
  "searching",
  "approaching",
  "combat",
  "looting",
  "healing",
  "kiting",
  "aoe",
];

export function CombatStateDisplay({ currentState, className }: CombatStateDisplayProps) {
  const current = stateConfig[currentState];
  const CurrentIcon = current.icon;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current State Hero */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border p-6 transition-all duration-500 animate-state-change",
          current.bgColor,
          "border-current/20"
        )}
        style={{ color: `hsl(var(--${currentState === 'idle' ? 'muted-foreground' : currentState === 'combat' ? 'destructive' : currentState === 'looting' ? 'success' : currentState === 'searching' ? 'primary' : 'warning'}))` }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50" />
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-4 rounded-xl",
            current.bgColor,
            current.color
          )}>
            <CurrentIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className={cn("text-2xl font-bold tracking-tight", current.color)}>
              {current.label}
            </h3>
            <p className="text-sm text-muted-foreground">{current.description}</p>
          </div>
        </div>
      </div>

      {/* State Grid */}
      <div className="grid grid-cols-4 gap-2">
        {states.map((state) => {
          const config = stateConfig[state];
          const Icon = config.icon;
          const isActive = state === currentState;

          return (
            <div
              key={state}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300",
                isActive 
                  ? cn(config.bgColor, "border border-current/30") 
                  : "bg-secondary/30 opacity-50 hover:opacity-75"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? config.color : "text-muted-foreground")} />
              <span className={cn(
                "text-[10px] font-medium uppercase tracking-wider",
                isActive ? config.color : "text-muted-foreground"
              )}>
                {state}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
