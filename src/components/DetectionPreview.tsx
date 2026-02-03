import { cn } from "@/lib/utils";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, MonitorOff, AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { useRoboflowInference, Detection } from "@/hooks/useRoboflowInference";
import { useCombatSystem } from "@/hooks/useCombatSystem";
import { useActionService } from "@/hooks/useActionService";
import { useVisionState, getStatusMessage } from "@/hooks/useVisionState";
import { RoboflowConfig } from "./RoboflowConfig";
import { CombatLogicPanel } from "./CombatLogicPanel";
import { CombatOverlay } from "./CombatOverlay";
import { HPBar } from "./HPBar";

interface DetectionPreviewProps {
  isRunning: boolean;
  className?: string;
}

const typeColors: Record<string, string> = {
  enemy_nameplate: "border-destructive bg-destructive/10",
  friendly_nameplate: "border-primary bg-primary/10",
  enemy_hp_bar: "border-destructive bg-destructive/10",
  player_hp_bar: "border-success bg-success/10",
  "our-hp": "border-success bg-success/20",
  "our_hp": "border-success bg-success/20",
  mana: "border-blue-500 bg-blue-500/20",
  loot: "border-yellow-500 bg-yellow-500/10",
  ore: "border-amber-600 bg-amber-600/10",
  mob: "border-purple-500 bg-purple-500/10",
  player_character: "border-cyan-400 bg-cyan-400/10",
  corpse: "border-muted-foreground bg-muted-foreground/10",
  resource_node: "border-emerald-500 bg-emerald-500/10",
  enemy: "border-destructive bg-destructive/10",
  friendly: "border-primary bg-primary/10",
  player: "border-cyan-400 bg-cyan-400/10",
};

export function DetectionPreview({ isRunning, className }: DetectionPreviewProps) {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [showCombatPanel, setShowCombatPanel] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inferenceLoopRef = useRef<number | null>(null);
  const fpsCounterRef = useRef<number[]>([]);

  // Vision state for HP/Mana tracking
  const visionState = useVisionState();

  const {
    isConfigured,
    isLoading: isInferenceLoading,
    error: inferenceError,
    modelUrl,
    setModelUrl,
    runInference,
    lastInferenceTime,
  } = useRoboflowInference();

  // Action service must be at the top level for stable hook order
  const actionService = useActionService();
  const combatSystem = useCombatSystem({ actionService });

  const startScreenCapture = useCallback(async () => {
    try {
      setCaptureError(null);
      visionState.setStatus("waiting_stream");
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsCapturing(true);
      visionState.setStreamActive(true);
      visionState.setStatus("ready");
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenCapture();
      };
    } catch (err) {
      console.error("Screen capture error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setCaptureError("Bildschirmaufnahme wurde abgelehnt");
        } else {
          setCaptureError("Fehler beim Starten der Bildschirmaufnahme");
        }
      }
      visionState.setStatus("error", "Bildschirmaufnahme fehlgeschlagen");
      setIsCapturing(false);
    }
  }, [visionState]);

  const stopScreenCapture = useCallback(() => {
    if (inferenceLoopRef.current) {
      cancelAnimationFrame(inferenceLoopRef.current);
      inferenceLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setDetections([]);
    setFps(0);
    visionState.setStreamActive(false);
    visionState.reset();
  }, [visionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inferenceLoopRef.current) {
        cancelAnimationFrame(inferenceLoopRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Inference loop with Roboflow
  useEffect(() => {
    if (!isRunning || !isCapturing || !isConfigured) {
      if (inferenceLoopRef.current) {
        cancelAnimationFrame(inferenceLoopRef.current);
        inferenceLoopRef.current = null;
      }
      return;
    }

    let lastInferenceTimeLocal = 0;
    const minInterval = 200; // Max 5 FPS to respect API rate limits

    const runLoop = async () => {
      if (!videoRef.current || !containerRef.current || !isRunning || !isCapturing) return;

      const now = performance.now();
      
      // Rate limit API calls
      if (now - lastInferenceTimeLocal >= minInterval) {
        lastInferenceTimeLocal = now;
        visionState.setStatus("inferencing");
        
        // Run Roboflow inference
        const results = await runInference(videoRef.current);
        setDetections(results);
        setFrameCount(f => f + 1);
        
        // Update vision state with detections (HP, Mana, entity categorization)
        visionState.updateFromDetections(results);

        // Process combat logic with video and container refs, using detected HP
        if (results.length > 0 && videoRef.current && containerRef.current) {
          combatSystem.processFrame(results, videoRef.current, containerRef.current, visionState.state.playerHp);
        }

        // Calculate FPS
        fpsCounterRef.current.push(now);
        const oneSecondAgo = now - 1000;
        fpsCounterRef.current = fpsCounterRef.current.filter(t => t > oneSecondAgo);
        const currentFps = fpsCounterRef.current.length;
        setFps(currentFps);
        visionState.updateFps(currentFps);
        visionState.setStatus("ready");
      }

      inferenceLoopRef.current = requestAnimationFrame(runLoop);
    };

    inferenceLoopRef.current = requestAnimationFrame(runLoop);

    return () => {
      if (inferenceLoopRef.current) {
        cancelAnimationFrame(inferenceLoopRef.current);
        inferenceLoopRef.current = null;
      }
    };
  }, [isRunning, isCapturing, isConfigured, runInference, combatSystem]);

  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    for (const [key, color] of Object.entries(typeColors)) {
      if (lowerType.includes(key.toLowerCase())) {
        return color;
      }
    }
    return "border-primary bg-primary/10";
  };

  // Get target color based on isolation status
  const getTargetColor = (detection: Detection) => {
    const target = combatSystem.nearbyTargets.find(t => t.detection.id === detection.id);
    if (!target) return getTypeColor(detection.type);
    
    if (target.isInDangerZone) {
      return "border-destructive bg-destructive/20";
    } else if (target.isIsolated) {
      return "border-success bg-success/20";
    } else {
      return "border-warning bg-warning/20";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Roboflow Config */}
      <RoboflowConfig
        modelUrl={modelUrl}
        onModelUrlChange={setModelUrl}
        isConfigured={isConfigured}
        error={inferenceError}
        isLoading={isInferenceLoading}
        lastInferenceTime={lastInferenceTime}
      />

      {/* Vision State Display - HP & Mana from Detection */}
      {isCapturing && (
        <div className="grid grid-cols-2 gap-3">
          <HPBar
            label="Spieler HP"
            value={visionState.state.playerHp}
            variant="player"
          />
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Mana
              </span>
              <span className="text-sm font-mono font-bold">
                {visionState.state.playerMana.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-4 bg-secondary rounded-full overflow-hidden border border-border">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out bg-blue-500 shadow-[0_0_10px_hsl(210_100%_50%/0.5)]"
                style={{ width: `${visionState.state.playerMana}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Container */}
      <div 
        ref={containerRef}
        className="relative aspect-video bg-secondary/30 rounded-lg border border-border overflow-hidden"
      >
        {/* Video element for screen capture */}
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-contain",
            !isCapturing && "hidden"
          )}
          muted
          playsInline
        />

        {/* Grid overlay when not capturing */}
        {!isCapturing && <div className="absolute inset-0 bg-grid opacity-30" />}
        
        {/* Scan line effect when running */}
        {isRunning && isCapturing && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
          </div>
        )}

        {/* Combat Overlay - Lines, Danger Zones, Scan Radius */}
        {isCapturing && (
          <CombatOverlay
            currentTarget={combatSystem.currentTarget}
            nearbyTargets={combatSystem.nearbyTargets}
            dangerZones={combatSystem.dangerZones}
            playerPosition={combatSystem.playerPosition}
            screenCenter={combatSystem.screenCenter}
            safetyDistance={combatSystem.config.safetyDistance}
            containerRef={containerRef}
          />
        )}

        {/* Detection boxes */}
        {isCapturing && detections.map((det) => {
          const isCurrentTarget = combatSystem.currentTarget?.detection.id === det.id;
          
          return (
            <div
              key={det.id}
              className={cn(
                "absolute border-2 rounded transition-all duration-150",
                getTargetColor(det),
                isCurrentTarget && "ring-2 ring-warning ring-offset-1 border-warning"
              )}
              style={{
                left: `${det.x}%`,
                top: `${det.y}%`,
                width: `${det.width}%`,
                height: `${det.height}%`,
              }}
            >
              {/* Label */}
              <div className="absolute -top-5 left-0 px-1 py-0.5 text-[8px] font-mono font-bold bg-card rounded whitespace-nowrap flex items-center gap-1">
                {det.type} {det.confidence.toFixed(0)}%
                {combatSystem.nearbyTargets.find(t => t.detection.id === det.id)?.isIsolated && (
                  <span className="text-success">★</span>
                )}
              </div>
              
              {/* Center crosshair */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-current opacity-50" />
              </div>
            </div>
          );
        })}

        {/* Center crosshair */}
        {isCapturing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              <div className="w-6 h-px bg-primary/50" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-primary/50" />
            </div>
          </div>
        )}

        {/* Status overlay when not capturing */}
        {!isCapturing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm gap-3">
            {captureError ? (
              <>
                <AlertCircle className="w-8 h-8 text-destructive" />
                <p className="text-sm text-destructive">{captureError}</p>
              </>
            ) : (
              <>
                <Monitor className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {getStatusMessage(visionState.state.status)}
                </p>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={startScreenCapture}
              disabled={!isConfigured}
            >
              <Monitor className="w-4 h-4" />
              Bildschirm aufnehmen
            </Button>
            {!isConfigured && (
              <p className="text-xs text-warning">Roboflow Modell wird automatisch konfiguriert...</p>
            )}
          </div>
        )}

        {/* Stop capture button when capturing */}
        {isCapturing && (
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              size="sm"
              variant={showCombatPanel ? "default" : "outline"}
              className="gap-1 opacity-80 hover:opacity-100"
              onClick={() => setShowCombatPanel(!showCombatPanel)}
            >
              Combat UI
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-2 opacity-80 hover:opacity-100"
              onClick={stopScreenCapture}
            >
              <MonitorOff className="w-4 h-4" />
              Stoppen
            </Button>
          </div>
        )}

        {/* Loading indicator with status */}
        {isCapturing && (
          <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-background/80 rounded text-xs">
            {isInferenceLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-warning" />
                <span className="text-warning">Analysiere...</span>
              </>
            ) : visionState.state.status === "ready" ? (
              <>
                <Wifi className="w-3 h-3 text-success" />
                <span className="text-success">Vision aktiv</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-muted-foreground" />
                <span>{getStatusMessage(visionState.state.status)}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      {isCapturing && (
        <div className="flex flex-wrap justify-between gap-2 text-[10px] font-mono text-muted-foreground bg-secondary/30 rounded px-2 py-1">
          <span>Frame: {frameCount}</span>
          <span>FPS: <span className="text-primary">{fps}</span></span>
          <span>Latenz: <span className="text-primary">{lastInferenceTime.toFixed(0)}ms</span></span>
          <span>Enemies: <span className="text-destructive font-bold">{visionState.state.enemies.length}</span></span>
          <span>Resources: <span className="text-amber-500 font-bold">{visionState.state.resources.length}</span></span>
          <span>Loot: <span className="text-yellow-500 font-bold">{visionState.state.loot.length}</span></span>
          <span className={combatSystem.actionService.isConnected ? "text-success" : "text-destructive"}>
            {combatSystem.actionService.isConnected ? "BRIDGE ✓" : "BRIDGE ✗"}
          </span>
          <span className="text-success">ROBOFLOW ✓</span>
        </div>
      )}

      {/* Combat Logic Panel */}
      {showCombatPanel && (
        <CombatLogicPanel
          config={combatSystem.config}
          skills={combatSystem.skills}
          combatState={combatSystem.combatState}
          currentTarget={combatSystem.currentTarget}
          nearbyTargets={combatSystem.nearbyTargets}
          dangerZones={combatSystem.dangerZones}
          combatStats={combatSystem.combatStats}
          actionServiceConfig={combatSystem.actionService.config}
          isActionServiceConnected={combatSystem.actionService.isConnected}
          onConfigChange={combatSystem.updateConfig}
          onSkillsChange={combatSystem.updateSkills}
          onResetStats={combatSystem.resetStats}
          onActionServiceConfigChange={combatSystem.actionService.updateConfig}
          onTestConnection={combatSystem.actionService.testConnection}
        />
      )}
    </div>
  );
}
