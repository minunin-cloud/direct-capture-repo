import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface Detection {
  id: number;
  type: "enemy" | "loot" | "friendly" | "player";
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface DetectionPreviewProps {
  isRunning: boolean;
  className?: string;
}

const typeColors = {
  enemy: "border-destructive bg-destructive/10",
  loot: "border-success bg-success/10",
  friendly: "border-primary bg-primary/10",
  player: "border-cyan-400 bg-cyan-400/10",
};

const typeLabels = {
  enemy: "ENEMY",
  loot: "LOOT",
  friendly: "FRIENDLY",
  player: "PLAYER",
};

export function DetectionPreview({ isRunning, className }: DetectionPreviewProps) {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [frameCount, setFrameCount] = useState(0);

  // Simulate detection updates when running
  useEffect(() => {
    if (!isRunning) {
      setDetections([]);
      return;
    }

    const interval = setInterval(() => {
      setFrameCount((f) => f + 1);
      
      // Generate random detections for demo
      const newDetections: Detection[] = [];
      const numDetections = Math.floor(Math.random() * 4) + 1;
      
      for (let i = 0; i < numDetections; i++) {
        const types: Detection["type"][] = ["enemy", "loot", "friendly", "player"];
        newDetections.push({
          id: i,
          type: types[Math.floor(Math.random() * types.length)],
          x: Math.random() * 70 + 5,
          y: Math.random() * 60 + 10,
          width: Math.random() * 15 + 10,
          height: Math.random() * 20 + 15,
          confidence: Math.random() * 30 + 70,
        });
      }
      
      setDetections(newDetections);
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className={cn("relative", className)}>
      {/* Preview Container */}
      <div className="relative aspect-video bg-secondary/30 rounded-lg border border-border overflow-hidden">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-30" />
        
        {/* Scan line effect when running */}
        {isRunning && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
          </div>
        )}

        {/* Detection boxes */}
        {detections.map((det) => (
          <div
            key={det.id}
            className={cn(
              "absolute border-2 rounded transition-all duration-150",
              typeColors[det.type]
            )}
            style={{
              left: `${det.x}%`,
              top: `${det.y}%`,
              width: `${det.width}%`,
              height: `${det.height}%`,
            }}
          >
            {/* Label */}
            <div className="absolute -top-5 left-0 px-1 py-0.5 text-[8px] font-mono font-bold bg-card rounded">
              {typeLabels[det.type]} {det.confidence.toFixed(0)}%
            </div>
            
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-current opacity-50" />
            </div>
          </div>
        ))}

        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="w-6 h-px bg-primary/50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-primary/50" />
          </div>
        </div>

        {/* Status overlay */}
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">Detection paused</p>
          </div>
        )}
      </div>

      {/* Frame counter */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-card/80 rounded text-[10px] font-mono text-muted-foreground">
        Frame: {frameCount}
      </div>

      {/* Detection count */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-card/80 rounded text-[10px] font-mono">
        <span className="text-muted-foreground">Detections: </span>
        <span className="text-primary font-bold">{detections.length}</span>
      </div>
    </div>
  );
}
