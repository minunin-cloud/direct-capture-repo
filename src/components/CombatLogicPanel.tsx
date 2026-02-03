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
  Trash2
} from "lucide-react";
import type { CombatConfig, Skill, PrioritizedTarget, CombatState } from "@/hooks/useCombatSystem";

interface CombatLogicPanelProps {
  config: CombatConfig;
  skills: Skill[];
  combatState: CombatState;
  currentTarget: PrioritizedTarget | null;
  nearbyTargets: PrioritizedTarget[];
  combatStats: {
    killCount: number;
    damageDealt: number;
    skillsUsed: number;
    aoeHits: number;
  };
  onConfigChange: (config: Partial<CombatConfig>) => void;
  onSkillsChange: (skills: Skill[]) => void;
  onResetStats: () => void;
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
};

export function CombatLogicPanel({
  config,
  skills,
  combatState,
  currentTarget,
  nearbyTargets,
  combatStats,
  onConfigChange,
  onSkillsChange,
  onResetStats,
  className,
}: CombatLogicPanelProps) {
  const StateIcon = stateIcons[combatState];

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
              </div>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {nearbyTargets.length} Ziele
        </Badge>
      </div>

      {/* Combat Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 bg-secondary/30 rounded text-center">
          <div className="text-lg font-bold text-primary">{combatStats.skillsUsed}</div>
          <div className="text-[10px] text-muted-foreground">Skills</div>
        </div>
        <div className="p-2 bg-secondary/30 rounded text-center">
          <div className="text-lg font-bold text-purple-400">{combatStats.aoeHits}</div>
          <div className="text-[10px] text-muted-foreground">AoE Hits</div>
        </div>
        <div className="p-2 bg-secondary/30 rounded text-center">
          <div className="text-lg font-bold text-destructive">{combatStats.killCount}</div>
          <div className="text-[10px] text-muted-foreground">Kills</div>
        </div>
        <div className="p-2 bg-secondary/30 rounded text-center">
          <Button size="sm" variant="ghost" className="h-auto p-1" onClick={onResetStats}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="text-[10px] text-muted-foreground">Reset</div>
        </div>
      </div>

      <Tabs defaultValue="targeting" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="targeting" className="text-xs">Targeting</TabsTrigger>
          <TabsTrigger value="rotation" className="text-xs">Rotation</TabsTrigger>
          <TabsTrigger value="behavior" className="text-xs">Verhalten</TabsTrigger>
        </TabsList>

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
              <Label className="text-xs">AoE Schwelle: {config.aoeThreshold} Gegner</Label>
              <Slider
                value={[config.aoeThreshold]}
                onValueChange={([v]) => onConfigChange({ aoeThreshold: v })}
                min={2}
                max={10}
                step={1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">AoE Radius: {config.aoeRadius}px</Label>
              <Slider
                value={[config.aoeRadius]}
                onValueChange={([v]) => onConfigChange({ aoeRadius: v })}
                min={50}
                max={300}
                step={10}
                className="mt-1"
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

        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Kampfreichweite: {config.combatRange}px</Label>
              <Slider
                value={[config.combatRange]}
                onValueChange={([v]) => onConfigChange({ combatRange: v })}
                min={50}
                max={300}
                step={10}
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
                <p className="text-[10px] text-muted-foreground">Distanz halten bei Bedrohung</p>
              </div>
              <Switch
                checked={config.kiteEnabled}
                onCheckedChange={(checked) => onConfigChange({ kiteEnabled: checked })}
              />
            </div>

            {config.kiteEnabled && (
              <div>
                <Label className="text-xs">Kiting Distanz: {config.kiteDistance}px</Label>
                <Slider
                  value={[config.kiteDistance]}
                  onValueChange={([v]) => onConfigChange({ kiteDistance: v })}
                  min={100}
                  max={400}
                  step={20}
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
              <div>
                <Label className="text-xs">Auto-Loot</Label>
                <p className="text-[10px] text-muted-foreground">Automatisch Beute sammeln</p>
              </div>
              <Switch
                checked={config.autoLoot}
                onCheckedChange={(checked) => onConfigChange({ autoLoot: checked })}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
