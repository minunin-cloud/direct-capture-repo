import { cn } from "@/lib/utils";
import { Monitor, Target, Heart, User, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScreenRegion {
  name: string;
  icon: typeof Monitor;
  top: number;
  left: number;
  width: number;
  height: number;
  color: string;
}

const defaultRegions: ScreenRegion[] = [
  { name: "Player HP", icon: User, top: 62, left: 2035, width: 141, height: 6, color: "bg-success" },
  { name: "Enemy HP", icon: Target, top: 61, left: 2246, width: 142, height: 5, color: "bg-destructive" },
  { name: "Target Status", icon: Heart, top: 55, left: 2341, width: 10, height: 10, color: "bg-warning" },
  { name: "Minimap", icon: Map, top: 22, left: 3607, width: 211, height: 202, color: "bg-primary" },
];

interface CalibrationPanelProps {
  className?: string;
}

export function CalibrationPanel({ className }: CalibrationPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Region List */}
      <div className="space-y-2">
        {defaultRegions.map((region) => {
          const Icon = region.icon;
          return (
            <div
              key={region.name}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-1.5 rounded", region.color + "/20")}>
                  <Icon className={cn("w-4 h-4", region.color.replace("bg-", "text-"))} />
                </div>
                <div>
                  <p className="text-sm font-medium">{region.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    ({region.left}, {region.top}) • {region.width}×{region.height}
                  </p>
                </div>
              </div>
              <div className={cn("w-2 h-2 rounded-full", region.color)} />
            </div>
          );
        })}
      </div>

      {/* Visual Monitor Preview */}
      <div className="relative aspect-video bg-secondary/20 rounded-lg border border-border overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        
        {/* Simulated regions - scaled to fit */}
        <div className="absolute inset-0 p-4">
          {/* Player HP region */}
          <div 
            className="absolute border-2 border-success rounded bg-success/10"
            style={{ left: "10%", top: "8%", width: "20%", height: "4%" }}
          >
            <span className="absolute -top-5 left-0 text-[8px] text-success font-mono">Player HP</span>
          </div>
          
          {/* Enemy HP region */}
          <div 
            className="absolute border-2 border-destructive rounded bg-destructive/10"
            style={{ left: "55%", top: "8%", width: "20%", height: "4%" }}
          >
            <span className="absolute -top-5 left-0 text-[8px] text-destructive font-mono">Enemy HP</span>
          </div>
          
          {/* Target Status */}
          <div 
            className="absolute border-2 border-warning rounded bg-warning/10"
            style={{ left: "78%", top: "6%", width: "3%", height: "6%" }}
          >
            <span className="absolute -top-5 left-0 text-[8px] text-warning font-mono whitespace-nowrap">Target</span>
          </div>
          
          {/* Minimap */}
          <div 
            className="absolute border-2 border-primary rounded bg-primary/10"
            style={{ right: "3%", top: "3%", width: "15%", height: "35%" }}
          >
            <span className="absolute -top-5 right-0 text-[8px] text-primary font-mono">Minimap</span>
          </div>
        </div>

        {/* Monitor label */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Monitor className="w-3 h-3" />
          <span>Monitor 2 • 1920×1080</span>
        </div>
      </div>

      {/* Recalibrate Button */}
      <Button variant="outline" className="w-full gap-2 text-sm" disabled>
        <Target className="w-4 h-4" />
        Recalibrate Regions
        <span className="text-xs text-muted-foreground">(Desktop only)</span>
      </Button>
    </div>
  );
}
