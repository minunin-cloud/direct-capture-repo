import { cn } from "@/lib/utils";

interface ColorRange {
  name: string;
  hLow: number;
  sLow: number;
  vLow: number;
  hHigh: number;
  sHigh: number;
  vHigh: number;
  preview: string;
}

const colorRanges: ColorRange[] = [
  { name: "Enemy Nameplate", hLow: 0, sLow: 150, vLow: 50, hHigh: 10, sHigh: 255, vHigh: 255, preview: "#ff3333" },
  { name: "HP Green", hLow: 40, sLow: 80, vLow: 30, hHigh: 80, sHigh: 255, vHigh: 255, preview: "#44cc44" },
  { name: "Route Marker", hLow: 150, sLow: 200, vLow: 200, hHigh: 150, sHigh: 200, vHigh: 200, preview: "#6699cc" },
];

interface ColorRangeDisplayProps {
  className?: string;
}

export function ColorRangeDisplay({ className }: ColorRangeDisplayProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-muted-foreground">
        HSV color ranges for OpenCV detection fallback
      </p>
      
      {colorRanges.map((range) => (
        <div
          key={range.name}
          className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{range.name}</span>
            <div 
              className="w-6 h-6 rounded border border-border"
              style={{ backgroundColor: range.preview }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="space-y-1">
              <p className="text-muted-foreground">Low</p>
              <div className="flex gap-2">
                <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">H:{range.hLow}</span>
                <span className="px-1.5 py-0.5 rounded bg-success/20 text-success">S:{range.sLow}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary">V:{range.vLow}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">High</p>
              <div className="flex gap-2">
                <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">H:{range.hHigh}</span>
                <span className="px-1.5 py-0.5 rounded bg-success/20 text-success">S:{range.sHigh}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary">V:{range.vHigh}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
