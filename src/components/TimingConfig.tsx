import { cn } from "@/lib/utils";
import { Clock, Timer, Hourglass, AlertTriangle } from "lucide-react";

interface TimingConfigProps {
  className?: string;
}

const timings = [
  { name: "Loot Timer", value: 2.5, unit: "s", icon: Timer, description: "Time to wait while looting" },
  { name: "Approach Timer", value: 4.0, unit: "s", icon: Hourglass, description: "Max approach duration" },
  { name: "Search Move", value: 2.5, unit: "s", icon: Clock, description: "Search movement interval" },
  { name: "Stuck Threshold", value: 2.0, unit: "s", icon: AlertTriangle, description: "Stuck detection time" },
];

export function TimingConfig({ className }: TimingConfigProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {timings.map((timing) => {
        const Icon = timing.icon;
        return (
          <div
            key={timing.name}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="p-1.5 rounded bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{timing.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{timing.description}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-bold text-primary">{timing.value}</span>
              <span className="text-xs text-muted-foreground ml-0.5">{timing.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
