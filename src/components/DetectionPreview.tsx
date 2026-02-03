import { cn } from "@/lib/utils";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, MonitorOff, AlertCircle } from "lucide-react";
import { useRoboflowInference, Detection } from "@/hooks/useRoboflowInference";
import { useCombatSystem } from "@/hooks/useCombatSystem";
import { useActionService } from "@/hooks/useActionService";
import { RoboflowConfig } from "./RoboflowConfig";
import { CombatLogicPanel } from "./CombatLogicPanel";
import { CombatOverlay } from "./CombatOverlay";

interface DetectionPreviewProps {
  isRunning: boolean;
  className?: string;
}

const typeColors: Record<string, string> = {
  enemy_nameplate: "border-destructive bg-destructive/10",
  friendly_nameplate: "border-primary bg-primary/10",
  enemy_hp_bar: "border-destructive bg-destructive/10",
  player_hp_bar: "border-success bg-success/10",
  loot: "border-success bg-success/10",
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsCapturing(true);
      
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
      setIsCapturing(false);
    }
  }, []);

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
  }, []);

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
        
        // Run Roboflow inference
        const results = await runInference(videoRef.current);
        setDetections(results);
        setFrameCount(f => f + 1);

        // Process combat logic with video and container refs
        if (results.length > 0 && videoRef.current && containerRef.current) {
          combatSystem.processFrame(results, videoRef.current, containerRef.current, 100);
        }

        // Calculate FPS
        fpsCounterRef.current.push(now);
        const oneSecondAgo = now - 1000;
        fpsCounterRef.current = fpsCounterRef.current.filter(t => t > oneSecondAgo);
        setFps(fpsCounterRef.current.length);
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
      />

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
                <p className="text-sm text-muted-foreground">Keine Bildschirmaufnahme aktiv</p>
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
              <p className="text-xs text-warning">Bitte zuerst Roboflow Model URL eingeben</p>
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

        {/* Loading indicator */}
        {isInferenceLoading && (
          <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-background/80 rounded text-xs">
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            Inferenz...
          </div>
        )}
      </div>

      {/* Stats bar */}
      {isCapturing && (
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>Frame: {frameCount}</span>
          <span>FPS: {fps}</span>
          <span>Latenz: {lastInferenceTime.toFixed(0)}ms</span>
          <span>Detections: <span className="text-primary font-bold">{detections.length}</span></span>
          <span className={combatSystem.actionService.isConnected ? "text-success" : "text-destructive"}>
            {combatSystem.actionService.isConnected ? "BRIDGE ✓" : "BRIDGE ✗"}
          </span>
          <span className="text-success">ROBOFLOW</span>
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
