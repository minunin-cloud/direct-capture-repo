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
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIndicator } from "@/components/StatusIndicator";
import { StatCard } from "@/components/StatCard";
import { CombatStateDisplay } from "@/components/CombatStateDisplay";
import { HPBar } from "@/components/HPBar";
import { KeybindGrid } from "@/components/KeybindGrid";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DetectionPreview } from "@/components/DetectionPreview";

type CombatState = "idle" | "searching" | "approaching" | "combat" | "looting" | "healing" | "kiting" | "aoe";

export default function Index() {
  const [isRunning, setIsRunning] = useState(false);
  const [combatState, setCombatState] = useState<CombatState>("idle");
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(0);
  const [stats, setStats] = useState({
    kills: 0,
    deaths: 0,
    loots: 0,
    kph: 0,
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

      // Simulate HP changes
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
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-gradient">YOLO</span>
                <span className="text-muted-foreground ml-1">WoW Bot</span>
              </h1>
            </div>
            <div className="hidden sm:block h-6 w-px bg-border" />
            <StatusIndicator 
              status={isRunning ? "running" : "idle"} 
              label={isRunning ? "Active" : "Standby"}
              className="hidden sm:flex"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor className="w-4 h-4" />
              <span>Monitor 2</span>
              <span className="mx-1">•</span>
              <Cpu className="w-4 h-4" />
              <span>NVIDIA GPU</span>
            </div>
            <Button
              onClick={handleToggleBot}
              variant={isRunning ? "destructive" : "default"}
              size="lg"
              className="gap-2 font-semibold"
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Bot
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Skull}
            label="Kills"
            value={stats.kills}
            variant="danger"
          />
          <StatCard
            icon={Heart}
            label="Deaths"
            value={stats.deaths}
            variant="default"
          />
          <StatCard
            icon={Package}
            label="Loots"
            value={stats.loots}
            variant="success"
          />
          <StatCard
            icon={TrendingUp}
            label="KPH"
            value={stats.kph}
            subValue="Kills per hour"
            variant="warning"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Detection Preview & Combat State */}
          <div className="lg:col-span-2 space-y-6">
            {/* Detection Preview */}
            <Card className="card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Detection Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetectionPreview isRunning={isRunning} />
              </CardContent>
            </Card>

            {/* Combat State */}
            <Card className="card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Combat State Machine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CombatStateDisplay currentState={combatState} />
              </CardContent>
            </Card>

            {/* HP Bars */}
            <Card className="card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Health Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <HPBar value={playerHP} label="Player HP" variant="player" />
                <HPBar value={enemyHP} label="Target HP" variant="enemy" />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Settings & Keybinds */}
          <div className="space-y-6">
            {/* Settings */}
            <Card className="card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SettingsPanel 
                  settings={settings} 
                  onSettingsChange={setSettings} 
                />
              </CardContent>
            </Card>

            {/* Keybinds */}
            <Card className="card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Keybinds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <KeybindGrid />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>YOLO WoW Bot v1.0 • Hybrid Detection Engine</p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            Model: yolov8n.pt
          </p>
        </div>
      </footer>
    </div>
  );
}
