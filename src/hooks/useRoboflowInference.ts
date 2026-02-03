import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Detection {
  id: number;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  centerX?: number;
  centerY?: number;
  rawWidth?: number;
  rawHeight?: number;
}

interface UseRoboflowInferenceOptions {
  modelUrl?: string;
  confidenceThreshold?: number;
}

interface UseRoboflowInferenceReturn {
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  modelUrl: string;
  setModelUrl: (url: string) => void;
  runInference: (video: HTMLVideoElement) => Promise<Detection[]>;
  lastInferenceTime: number;
}

export function useRoboflowInference({
  modelUrl: initialModelUrl = "",
  confidenceThreshold = 50,
}: UseRoboflowInferenceOptions = {}): UseRoboflowInferenceReturn {
  const [modelUrl, setModelUrl] = useState(initialModelUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInferenceTime, setLastInferenceTime] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas for frame extraction
  if (!canvasRef.current && typeof document !== "undefined") {
    canvasRef.current = document.createElement("canvas");
  }

  const isConfigured = modelUrl.length > 0;

  const runInference = useCallback(async (video: HTMLVideoElement): Promise<Detection[]> => {
    if (!modelUrl || !canvasRef.current) {
      return [];
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    setIsLoading(true);
    setError(null);

    try {
      // Set canvas size to video dimensions (or reasonable max for performance)
      const maxDim = 640; // Roboflow typically uses 640x640
      const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];

      const startTime = performance.now();

      // Call edge function
      const { data, error: fnError } = await supabase.functions.invoke("roboflow-inference", {
        body: { imageBase64, modelUrl },
      });

      const inferenceTime = performance.now() - startTime;
      setLastInferenceTime(inferenceTime);

      if (fnError) {
        throw new Error(fnError.message || "Inference failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Filter by confidence threshold
      const detections = (data?.detections || []).filter(
        (d: Detection) => d.confidence >= confidenceThreshold
      );

      return detections;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Inference failed";
      console.error("Roboflow inference error:", err);
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [modelUrl, confidenceThreshold]);

  return {
    isConfigured,
    isLoading,
    error,
    modelUrl,
    setModelUrl,
    runInference,
    lastInferenceTime,
  };
}
