import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  settings: {
    confidence: number;
    iouThreshold: number;
    halfPrecision: boolean;
    aoeMinEnemies: number;
    healThreshold: number;
    executeThreshold: number;
  };
  onSettingsChange: (settings: SettingsPanelProps["settings"]) => void;
  className?: string;
}

export function SettingsPanel({ settings, onSettingsChange, className }: SettingsPanelProps) {
  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Detection Settings */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Detection
        </h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Confidence</Label>
              <span className="text-sm font-mono text-primary">{settings.confidence}%</span>
            </div>
            <Slider
              value={[settings.confidence]}
              onValueChange={([v]) => updateSetting("confidence", v)}
              min={20}
              max={95}
              step={5}
              className="cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">IoU Threshold</Label>
              <span className="text-sm font-mono text-primary">{settings.iouThreshold}%</span>
            </div>
            <Slider
              value={[settings.iouThreshold]}
              onValueChange={([v]) => updateSetting("iouThreshold", v)}
              min={20}
              max={90}
              step={5}
              className="cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Half Precision (FP16)</Label>
            <Switch
              checked={settings.halfPrecision}
              onCheckedChange={(v) => updateSetting("halfPrecision", v)}
            />
          </div>
        </div>
      </div>

      {/* Combat Settings */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Combat
        </h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Heal Threshold</Label>
              <span className="text-sm font-mono text-success">{settings.healThreshold}%</span>
            </div>
            <Slider
              value={[settings.healThreshold]}
              onValueChange={([v]) => updateSetting("healThreshold", v)}
              min={20}
              max={80}
              step={5}
              className="cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Execute Threshold</Label>
              <span className="text-sm font-mono text-destructive">{settings.executeThreshold}%</span>
            </div>
            <Slider
              value={[settings.executeThreshold]}
              onValueChange={([v]) => updateSetting("executeThreshold", v)}
              min={10}
              max={50}
              step={5}
              className="cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">AoE Min Enemies</Label>
              <span className="text-sm font-mono text-purple-400">{settings.aoeMinEnemies}</span>
            </div>
            <Slider
              value={[settings.aoeMinEnemies]}
              onValueChange={([v]) => updateSetting("aoeMinEnemies", v)}
              min={2}
              max={6}
              step={1}
              className="cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
