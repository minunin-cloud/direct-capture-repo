import { cn } from "@/lib/utils";
import { Camera, Database, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface TrainingPanelProps {
  className?: string;
}

const datasetClasses = [
  { id: 0, name: "enemy_nameplate", count: 245, color: "bg-destructive" },
  { id: 1, name: "friendly_nameplate", count: 89, color: "bg-primary" },
  { id: 2, name: "enemy_hp_bar", count: 312, color: "bg-destructive" },
  { id: 3, name: "player_hp_bar", count: 156, color: "bg-success" },
  { id: 4, name: "loot", count: 78, color: "bg-warning" },
  { id: 5, name: "mob", count: 423, color: "bg-purple-500" },
  { id: 6, name: "player_character", count: 67, color: "bg-cyan-400" },
  { id: 7, name: "corpse", count: 134, color: "bg-muted-foreground" },
  { id: 8, name: "resource_node", count: 45, color: "bg-emerald-500" },
];

export function TrainingPanel({ className }: TrainingPanelProps) {
  const totalSamples = datasetClasses.reduce((sum, c) => sum + c.count, 0);
  const maxCount = Math.max(...datasetClasses.map(c => c.count));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dataset Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
          <p className="text-2xl font-bold font-mono text-primary">{totalSamples}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Samples</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
          <p className="text-2xl font-bold font-mono text-success">9</p>
          <p className="text-[10px] text-muted-foreground uppercase">Classes</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
          <p className="text-2xl font-bold font-mono text-warning">80/20</p>
          <p className="text-[10px] text-muted-foreground uppercase">Train/Val</p>
        </div>
      </div>

      {/* Class Distribution */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Class Distribution
        </h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
          {datasetClasses.map((cls) => (
            <div key={cls.id} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-4">{cls.id}</span>
              <div className="flex-1 h-5 bg-secondary/30 rounded overflow-hidden">
                <div 
                  className={cn("h-full flex items-center px-2 transition-all", cls.color)}
                  style={{ width: `${(cls.count / maxCount) * 100}%` }}
                >
                  <span className="text-[9px] font-medium truncate text-white">
                    {cls.name}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                {cls.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Model Status */}
      <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Model Status</span>
          <div className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Base Model:</span>
            <span className="font-mono">yolov8n.pt</span>
          </div>
          <div className="flex justify-between">
            <span>Custom Model:</span>
            <span className="font-mono text-primary">wow_detector.pt</span>
          </div>
          <div className="flex justify-between">
            <span>Last Trained:</span>
            <span className="font-mono">2026-02-01</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" disabled>
          <Camera className="w-3.5 h-3.5" />
          Capture
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" disabled>
          <Database className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Training features require desktop Python environment
      </p>
    </div>
  );
}
