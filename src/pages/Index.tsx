import { useState, useEffect } from "react";
import { 
  Skull, 
  Heart, 
  Package, 
  TrendingUp, 
  Play, 
  Square, 
  Settings,
  Monitor,
  Cpu,
  Eye,
  Crosshair,
  Palette,
  Database,
  Clock,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusIndicator } from "@/components/StatusIndicator";
import { StatCard } from "@/components/StatCard";
import { CombatStateDisplay } from "@/components/CombatStateDisplay";
import { HPBar } from "@/components/HPBar";
import { KeybindGrid } from "@/components/KeybindGrid";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DetectionPreview } from "@/components/DetectionPreview";
import { CalibrationPanel } from "@/components/CalibrationPanel";
import { ColorRangeDisplay } from "@/components/ColorRangeDisplay";
import { TrainingPanel } from "@/components/TrainingPanel";
import { TimingConfig } from "@/components/TimingConfig";
import { cn } from "@/lib/utils";

type CombatState = "idle" | "searching" | "approaching" | "combat" | "looting" | "healing" | "kiting" | "aoe";

export default function Index() {
  const [isRunning, setIsRunning] = useState(false);
  const [combatState, setCombatState] = useState<CombatState>("idle");
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(0);
  const [detectionMode, setDetectionMode] = useState<"yolo" | "opencv">("yolo");
  const [stats, setStats] = useState({
    kills: 0,
    deaths: 0,
    loots: 0,
    kph: 0,
    stuckEvents: 0,
    aoeCombats: 0,
  });
  const [settings, setSettings] = useState({
    confidence: 45,
    iouThreshold: 50,
    halfPrecision: true,
    aoeMinEnemies: 3,
    healThreshold: 60,
    executeThreshold: 30,
  });

  // Simulate bot activity when running
  useEffect(() => {
    if (!isRunning) return;

    const states: CombatState[] = ["searching", "approaching", "combat", "looting", "healing"];
    let stateIndex = 0;

    const stateInterval = setInterval(() => {
      stateIndex = (stateIndex + 1) % states.length;
      setCombatState(states[stateIndex]);

      if (states[stateIndex] === "combat") {
        setPlayerHP((hp) => Math.max(30, hp - Math.random() * 20));
        setEnemyHP(Math.random() * 100);
      } else if (states[stateIndex] === "healing") {
        setPlayerHP((hp) => Math.min(100, hp + 30));
      } else if (states[stateIndex] === "looting") {
        setEnemyHP(0);
        setStats((s) => ({
          ...s,
          kills: s.kills + 1,
          loots: s.loots + 1,
          kph: Math.round((s.kills + 1) * 12),
        }));
      }
    }, 2000);

    return () => clearInterval(stateInterval);
  }, [isRunning]);

  const handleToggleBot = () => {
    if (isRunning) {
      setIsRunning(false);
      setCombatState("idle");
      setEnemyHP(0);
    } else {
      setIsRunning(true);
      setCombatState("searching");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-gradient">WoW</span>
                <span className="text-muted-foreground ml-1">Bot</span>
              </h1>
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">v4.0</span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-border" />
            <StatusIndicator 
              status={isRunning ? "running" : "idle"} 
              label={isRunning ? "Active" : "Standby"}
              className="hidden sm:flex"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Detection Mode Toggle */}
            <div className="hidden md:flex items-center gap-1 p-1 bg-secondary rounded-lg">
              <button
                onClick={() => setDetectionMode("yolo")}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                  detectionMode === "yolo" 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                YOLO
              </button>
              <button
                onClick={() => setDetectionMode("opencv")}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                  detectionMode === "opencv" 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                OpenCV
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor className="w-3.5 h-3.5" />
              <span>Monitor 2</span>
              <span className="mx-0.5">•</span>
              <Cpu className="w-3.5 h-3.5" />
              <span>NVIDIA GPU</span>
            </div>
            <Button
              onClick={handleToggleBot}
              variant={isRunning ? "destructive" : "default"}
              className="gap-2 font-semibold"
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  <span className="hidden sm:inline">Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Start Bot</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Skull} label="Kills" value={stats.kills} variant="danger" />
          <StatCard icon={Heart} label="Deaths" value={stats.deaths} variant="default" />
          <StatCard icon={Package} label="Loots" value={stats.loots} variant="success" />
          <StatCard icon={TrendingUp} label="KPH" value={stats.kph} variant="warning" />
          <StatCard icon={Eye} label="Stuck" value={stats.stuckEvents} variant="default" />
          <StatCard icon={Skull} label="AoE" value={stats.aoeCombats} variant="default" />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left Column - Detection & Combat */}
          <div className="lg:col-span-2 space-y-4">
            {/* Detection Preview */}
            <Card className="card-glow">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Detection Preview
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-mono",
                    detectionMode === "yolo" ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"
                  )}>
                    {detectionMode.toUpperCase()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DetectionPreview isRunning={isRunning} />
              </CardContent>
            </Card>

            {/* Combat State & HP */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Combat State
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CombatStateDisplay currentState={combatState} />
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Health Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <HPBar value={playerHP} label="Player HP" variant="player" />
                  <HPBar value={enemyHP} label="Target HP" variant="enemy" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Settings Tabs */}
          <div className="space-y-4">
            <Card className="card-glow">
              <Tabs defaultValue="config" className="w-full">
                <CardHeader className="pb-0">
                  <TabsList className="w-full grid grid-cols-4 h-8">
                    <TabsTrigger value="config" className="text-xs gap-1">
                      <Settings className="w-3 h-3" />
                      <span className="hidden sm:inline">Config</span>
                    </TabsTrigger>
                    <TabsTrigger value="calibration" className="text-xs gap-1">
                      <Crosshair className="w-3 h-3" />
                      <span className="hidden sm:inline">Vision</span>
                    </TabsTrigger>
                    <TabsTrigger value="training" className="text-xs gap-1">
                      <Database className="w-3 h-3" />
                      <span className="hidden sm:inline">Train</span>
                    </TabsTrigger>
                    <TabsTrigger value="keys" className="text-xs gap-1">
                      <span className="font-mono text-[10px]">⌨</span>
                      <span className="hidden sm:inline">Keys</span>
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  <TabsContent value="config" className="mt-0 space-y-4">
                    <SettingsPanel settings={settings} onSettingsChange={setSettings} />
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Clock className="w-3 h-3" />
                        <span>Timing Config</span>
                        <ChevronDown className="w-3 h-3" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3">
                        <TimingConfig />
                      </CollapsibleContent>
                    </Collapsible>
                  </TabsContent>
                  
                  <TabsContent value="calibration" className="mt-0 space-y-4">
                    <CalibrationPanel />
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Palette className="w-3 h-3" />
                        <span>Color Ranges (HSV)</span>
                        <ChevronDown className="w-3 h-3" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3">
                        <ColorRangeDisplay />
                      </CollapsibleContent>
                    </Collapsible>
                  </TabsContent>
                  
                  <TabsContent value="training" className="mt-0">
                    <TrainingPanel />
                  </TabsContent>
                  
                  <TabsContent value="keys" className="mt-0">
                    <KeybindGrid />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3 mt-4">
        <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>WoW Bot v4.0 Enhanced Edition • Hybrid Detection Engine</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              YOLO: yolov8n.pt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning" />
              OpenCV: Active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
