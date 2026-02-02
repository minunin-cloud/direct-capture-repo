import { cn } from "@/lib/utils";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, MonitorOff, AlertCircle, Play, Pause } from "lucide-react";
import { useObjectDetection, Detection } from "@/hooks/useObjectDetection";
import { ModelLoader } from "./ModelLoader";

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
  // Fallbacks
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
  const [useSimulation, setUseSimulation] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inferenceLoopRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef<number[]>([]);

  const {
    isModelLoaded,
    isLoading: isModelLoading,
    error: modelError,
    loadModel,
    runInference,
    classNames,
  } = useObjectDetection();

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

  // Real inference loop
  useEffect(() => {
    if (!isRunning || !isCapturing || !isModelLoaded || useSimulation) {
      if (inferenceLoopRef.current) {
        cancelAnimationFrame(inferenceLoopRef.current);
        inferenceLoopRef.current = null;
      }
      return;
    }

    const runLoop = async () => {
      if (!videoRef.current || !isRunning || !isCapturing) return;

      const now = performance.now();
      
      // Run inference
      const results = await runInference(videoRef.current);
      setDetections(results);
      setFrameCount(f => f + 1);

      // Calculate FPS
      fpsCounterRef.current.push(now);
      const oneSecondAgo = now - 1000;
      fpsCounterRef.current = fpsCounterRef.current.filter(t => t > oneSecondAgo);
      setFps(fpsCounterRef.current.length);

      lastFrameTimeRef.current = now;
      inferenceLoopRef.current = requestAnimationFrame(runLoop);
    };

    inferenceLoopRef.current = requestAnimationFrame(runLoop);

    return () => {
      if (inferenceLoopRef.current) {
        cancelAnimationFrame(inferenceLoopRef.current);
        inferenceLoopRef.current = null;
      }
    };
  }, [isRunning, isCapturing, isModelLoaded, useSimulation, runInference]);

  // Simulation mode for demo/testing
  useEffect(() => {
    if (!isRunning || !isCapturing || !useSimulation) {
      return;
    }

    const interval = setInterval(() => {
      setFrameCount((f) => f + 1);
      
      const newDetections: Detection[] = [];
      const numDetections = Math.floor(Math.random() * 4) + 1;
      
      for (let i = 0; i < numDetections; i++) {
        const types = classNames.length > 0 ? classNames : ["enemy_nameplate", "loot", "mob", "player_character"];
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
      setFps(5); // Simulated FPS
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning, isCapturing, useSimulation, classNames]);

  const getTypeColor = (type: string) => {
    return typeColors[type] || "border-primary bg-primary/10";
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Model Loader */}
      <ModelLoader
        isModelLoaded={isModelLoaded}
        isLoading={isModelLoading}
        error={modelError}
        onLoadModel={loadModel}
      />

      {/* Simulation Toggle */}
      {isModelLoaded && (
        <div className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg border border-border">
          <span className="text-xs text-muted-foreground">
            {useSimulation ? "Simulations-Modus" : "ML-Inferenz aktiv"}
          </span>
          <Button
            size="sm"
            variant={useSimulation ? "outline" : "default"}
            className="h-6 text-xs gap-1"
            onClick={() => setUseSimulation(!useSimulation)}
          >
            {useSimulation ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {useSimulation ? "ML aktivieren" : "Simulation"}
          </Button>
        </div>
      )}

      {/* Preview Container */}
      <div className="relative aspect-video bg-secondary/30 rounded-lg border border-border overflow-hidden">
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

        {/* Detection boxes */}
        {isCapturing && detections.map((det) => (
          <div
            key={det.id}
            className={cn(
              "absolute border-2 rounded transition-all duration-150",
              getTypeColor(det.type)
            )}
            style={{
              left: `${det.x}%`,
              top: `${det.y}%`,
              width: `${det.width}%`,
              height: `${det.height}%`,
            }}
          >
            {/* Label */}
            <div className="absolute -top-5 left-0 px-1 py-0.5 text-[8px] font-mono font-bold bg-card rounded whitespace-nowrap">
              {det.type} {det.confidence.toFixed(0)}%
            </div>
            
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-current opacity-50" />
            </div>
          </div>
        ))}

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
            >
              <Monitor className="w-4 h-4" />
              Bildschirm aufnehmen
            </Button>
          </div>
        )}

        {/* Stop capture button when capturing */}
        {isCapturing && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 gap-2 opacity-80 hover:opacity-100"
            onClick={stopScreenCapture}
          >
            <MonitorOff className="w-4 h-4" />
            Stoppen
          </Button>
        )}
      </div>

      {/* Stats bar */}
      {isCapturing && (
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>Frame: {frameCount}</span>
          <span>FPS: {fps}</span>
          <span>Detections: <span className="text-primary font-bold">{detections.length}</span></span>
          <span className={cn(
            useSimulation ? "text-warning" : "text-success"
          )}>
            {useSimulation ? "SIM" : "ML"}
          </span>
        </div>
      )}
    </div>
  );
}
