import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  Zap, 
  RotateCcw, 
  Settings2,
  Swords,
  Wind,
  Heart,
  Package,
  Timer,
  Plus,
  Trash2,
  ShieldAlert,
  Power,
  Activity,
  AlertTriangle
} from "lucide-react";
import type { CombatConfig, Skill, PrioritizedTarget, CombatState } from "@/hooks/useCombatSystem";
import type { ActionServiceConfig } from "@/hooks/useActionService";

interface CombatLogicPanelProps {
  config: CombatConfig;
  skills: Skill[];
  combatState: CombatState;
  currentTarget: PrioritizedTarget | null;
  nearbyTargets: PrioritizedTarget[];
  dangerZones: { x: number; y: number; radius: number; mobCount: number }[];
  combatStats: {
    killCount: number;
    damageDealt: number;
    skillsUsed: number;
    aoeHits: number;
    dangersAvoided: number;
  };
  actionServiceConfig: ActionServiceConfig;
  isActionServiceConnected: boolean;
  onConfigChange: (config: Partial<CombatConfig>) => void;
  onSkillsChange: (skills: Skill[]) => void;
  onResetStats: () => void;
  onActionServiceConfigChange: (config: Partial<ActionServiceConfig>) => void;
  onTestConnection: () => void;
  className?: string;
}

const stateIcons: Record<CombatState, typeof Swords> = {
  idle: Settings2,
  searching: Target,
  approaching: Wind,
  combat: Swords,
  looting: Package,
  healing: Heart,
  kiting: Wind,
  aoe: Zap,
  avoiding: ShieldAlert,
};

const stateColors: Record<CombatState, string> = {
  idle: "text-muted-foreground",
  searching: "text-primary",
  approaching: "text-warning",
  combat: "text-destructive",
  looting: "text-success",
  healing: "text-pink-400",
  kiting: "text-cyan-400",
  aoe: "text-purple-400",
  avoiding: "text-orange-400",
};

export function CombatLogicPanel({
  config,
  skills,
  combatState,
  currentTarget,
  nearbyTargets,
  dangerZones,
  combatStats,
  actionServiceConfig,
  isActionServiceConnected,
  onConfigChange,
  onSkillsChange,
  onResetStats,
  onActionServiceConfigChange,
  onTestConnection,
  className,
}: CombatLogicPanelProps) {
  const StateIcon = stateIcons[combatState];
  const isolatedTargets = nearbyTargets.filter(t => t.isIsolated);
  const groupedTargets = nearbyTargets.filter(t => !t.isIsolated);

  const updateSkill = (index: number, updates: Partial<Skill>) => {
    const newSkills = [...skills];
    newSkills[index] = { ...newSkills[index], ...updates };
    onSkillsChange(newSkills);
  };

  const addSkill = () => {
    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name: "Neuer Skill",
      keybind: String(skills.length + 1),
      cooldown: 5000,
      lastUsed: 0,
      priority: skills.length + 1,
      isAoe: false,
      range: 100,
    };
    onSkillsChange([...skills, newSkill]);
  };

  const removeSkill = (index: number) => {
    onSkillsChange(skills.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Combat Master Toggle */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border-2 transition-colors",
        config.combatEnabled 
          ? "bg-success/10 border-success" 
          : "bg-secondary/50 border-border"
      )}>
        <div className="flex items-center gap-3">
          <Power className={cn("w-5 h-5", config.combatEnabled ? "text-success" : "text-muted-foreground")} />
          <div>
            <div className="font-bold text-sm">Combat Automation</div>
            <div className="text-xs text-muted-foreground">
              {config.combatEnabled ? "Aktiv - Sendet Befehle" : "Deaktiviert"}
            </div>
          </div>
        </div>
        <Switch
          checked={config.combatEnabled}
          onCheckedChange={(checked) => onConfigChange({ combatEnabled: checked })}
        />
      </div>

      {/* Current State Display */}
      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-background", stateColors[combatState])}>
            <StateIcon className="w-5 h-5" />
          </div>
          <div>
            <div className={cn("font-bold uppercase text-sm", stateColors[combatState])}>
              {combatState}
            </div>
            {currentTarget && (
              <div className="text-xs text-muted-foreground">
                Ziel: {currentTarget.detection.type} ({currentTarget.distance.toFixed(0)}px)
                {currentTarget.isIsolated && <span className="text-success ml-1">★</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs text-success">
            {isolatedTargets.length} Isoliert
          </Badge>
          <Badge variant="outline" className="text-xs text-destructive">
            {groupedTargets.length} Gruppe
          </Badge>
        </div>
      </div>

      {/* Danger Zones Warning */}
      {dangerZones.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg text-xs">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="text-destructive">
            {dangerZones.length} Danger Zone{dangerZones.length > 1 ? "s" : ""} erkannt 
            ({dangerZones.reduce((sum, z) => sum + z.mobCount, 0)} Mobs)
          </span>
        </div>
      )}

      {/* Combat Stats */}
      <div className="grid grid-cols-5 gap-2">
        <div className="p-2 bg-secondary/30 rounded text-center">
          <div className="text-lg font-bold text-primary">{combatStats.skillsUsed}</div>
          <div className="text-[10px] text-muted-foreground">Skills</div>
        </div>
        <div className="p-2 bg-secondary/30 rounded text-center">
          <div className="text-lg font-bold text-purple-400">{combatStats.aoeHits}</div>
          <div className="text-[10px] text-muted-foreground">AoE</div>
        </div>
        <div className="p-2 bg-secondary/30 rounded text-center">
          <div className="text-lg font-bold text-destructive">{combatStats.killCount}</div>
          <div className="text-[10px] text-muted-foreground">Kills</div>
        </div>
        <div className="p-2 bg-secondary/30 rounded text-center">
          <div className="text-lg font-bold text-orange-400">{combatStats.dangersAvoided}</div>
          <div className="text-[10px] text-muted-foreground">Avoided</div>
        </div>
        <div className="p-2 bg-secondary/30 rounded text-center">
          <Button size="sm" variant="ghost" className="h-auto p-1" onClick={onResetStats}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="text-[10px] text-muted-foreground">Reset</div>
        </div>
      </div>

      <Tabs defaultValue="avoidance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="avoidance" className="text-xs">Gruppen</TabsTrigger>
          <TabsTrigger value="targeting" className="text-xs">Targeting</TabsTrigger>
          <TabsTrigger value="rotation" className="text-xs">Rotation</TabsTrigger>
          <TabsTrigger value="bridge" className="text-xs">Bridge</TabsTrigger>
        </TabsList>

        {/* Group Avoidance Tab - CORE FEATURE */}
        <TabsContent value="avoidance" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
              <div>
                <Label className="text-xs">Danger Zones meiden</Label>
                <p className="text-[10px] text-muted-foreground">Gruppen von Mobs umgehen</p>
              </div>
              <Switch
                checked={config.avoidDangerZones}
                onCheckedChange={(checked) => onConfigChange({ avoidDangerZones: checked })}
              />
            </div>

            <div>
              <Label className="text-xs">
                Mob Density Threshold: {config.mobDensityThreshold} Gegner
              </Label>
              <p className="text-[10px] text-muted-foreground mb-1">
                Max. Nachbarn bevor als "Gruppe" markiert
              </p>
              <Slider
                value={[config.mobDensityThreshold]}
                onValueChange={([v]) => onConfigChange({ mobDensityThreshold: v })}
                min={1}
                max={10}
                step={1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Safety Distance: {config.safetyDistance}px</Label>
              <p className="text-[10px] text-muted-foreground mb-1">
                Radius für Gruppen-Erkennung
              </p>
              <Slider
                value={[config.safetyDistance]}
                onValueChange={([v]) => onConfigChange({ safetyDistance: v })}
                min={50}
                max={400}
                step={10}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Min Attack Range: {config.minAttackRange}px</Label>
              <Slider
                value={[config.minAttackRange]}
                onValueChange={([v]) => onConfigChange({ minAttackRange: v })}
                min={10}
                max={100}
                step={5}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Max Attack Range: {config.maxAttackRange}px</Label>
              <Slider
                value={[config.maxAttackRange]}
                onValueChange={([v]) => onConfigChange({ maxAttackRange: v })}
                min={50}
                max={300}
                step={10}
                className="mt-1"
              />
            </div>
          </div>
        </TabsContent>

        {/* Targeting Tab */}
        <TabsContent value="targeting" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Maximale Zieldistanz: {config.maxTargetDistance}px</Label>
              <Slider
                value={[config.maxTargetDistance]}
                onValueChange={([v]) => onConfigChange({ maxTargetDistance: v })}
                min={100}
                max={1000}
                step={50}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Heal bei HP: {config.healThreshold}%</Label>
              <Slider
                value={[config.healThreshold]}
                onValueChange={([v]) => onConfigChange({ healThreshold: v })}
                min={10}
                max={80}
                step={5}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
              <div>
                <Label className="text-xs">Kiting aktiviert</Label>
                <p className="text-[10px] text-muted-foreground">Distanz halten</p>
              </div>
              <Switch
                checked={config.kiteEnabled}
                onCheckedChange={(checked) => onConfigChange({ kiteEnabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Prioritäts-Gewichtung</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(config.priorityWeights).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                    <span className="capitalize">{key}</span>
                    <Input
                      type="number"
                      value={value}
                      onChange={(e) => onConfigChange({
                        priorityWeights: {
                          ...config.priorityWeights,
                          [key]: parseFloat(e.target.value) || 0
                        }
                      })}
                      className="w-16 h-6 text-xs"
                      min={0}
                      max={1}
                      step={0.1}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Rotation Tab */}
        <TabsContent value="rotation" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold">Skill Rotation</Label>
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={addSkill}>
              <Plus className="w-3 h-3" /> Skill
            </Button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {skills.map((skill, index) => (
              <div key={skill.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded border border-border">
                <div className="flex items-center justify-center w-6 h-6 bg-primary/20 rounded text-xs font-bold">
                  {skill.keybind}
                </div>
                <Input
                  value={skill.name}
                  onChange={(e) => updateSkill(index, { name: e.target.value })}
                  className="flex-1 h-6 text-xs"
                  placeholder="Skill Name"
                />
                <div className="flex items-center gap-1">
                  <Timer className="w-3 h-3 text-muted-foreground" />
                  <Input
                    type="number"
                    value={skill.cooldown / 1000}
                    onChange={(e) => updateSkill(index, { cooldown: (parseFloat(e.target.value) || 0) * 1000 })}
                    className="w-12 h-6 text-xs"
                    min={0}
                    step={0.5}
                  />
                  <span className="text-[10px] text-muted-foreground">s</span>
                </div>
                <Switch
                  checked={skill.isAoe}
                  onCheckedChange={(checked) => updateSkill(index, { isAoe: checked })}
                />
                <span className="text-[10px] text-muted-foreground w-8">AoE</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeSkill(index)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Python Bridge Tab */}
        <TabsContent value="bridge" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
              <div className="flex items-center gap-2">
                <Activity className={cn(
                  "w-4 h-4",
                  isActionServiceConnected ? "text-success" : "text-destructive"
                )} />
                <div>
                  <Label className="text-xs">Bridge Status</Label>
                  <p className="text-[10px] text-muted-foreground">
                    {isActionServiceConnected ? "Verbunden" : "Nicht verbunden"}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={onTestConnection}>
                Test
              </Button>
            </div>

            <div>
              <Label className="text-xs">Bridge URL</Label>
              <Input
                value={actionServiceConfig.bridgeUrl}
                onChange={(e) => onActionServiceConfigChange({ bridgeUrl: e.target.value })}
                className="mt-1 h-8 text-xs"
                placeholder="http://localhost:5001/action"
              />
            </div>

            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
              <div>
                <Label className="text-xs">Bridge aktiviert</Label>
                <p className="text-[10px] text-muted-foreground">Befehle senden</p>
              </div>
              <Switch
                checked={actionServiceConfig.enabled}
                onCheckedChange={(checked) => onActionServiceConfigChange({ enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
              <div>
                <Label className="text-xs">Action Logging</Label>
                <p className="text-[10px] text-muted-foreground">Befehle protokollieren</p>
              </div>
              <Switch
                checked={actionServiceConfig.logActions}
                onCheckedChange={(checked) => onActionServiceConfigChange({ logActions: checked })}
              />
            </div>

            <div>
              <Label className="text-xs">Stuck Timeout: {config.stuckTimeout / 1000}s</Label>
              <p className="text-[10px] text-muted-foreground mb-1">
                Zeit bis Sprung bei Stillstand
              </p>
              <Slider
                value={[config.stuckTimeout]}
                onValueChange={([v]) => onConfigChange({ stuckTimeout: v })}
                min={500}
                max={5000}
                step={250}
                className="mt-1"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
