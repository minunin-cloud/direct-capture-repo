import { useState, useCallback, useRef, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";

export interface Detection {
  id: number;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface UseObjectDetectionOptions {
  modelUrl?: string;
  confidenceThreshold?: number;
  maxDetections?: number;
}

interface UseObjectDetectionReturn {
  isModelLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadModel: (url: string) => Promise<void>;
  runInference: (video: HTMLVideoElement) => Promise<Detection[]>;
  classNames: string[];
}

// Default class names from the training panel - can be overridden by model metadata
const DEFAULT_CLASS_NAMES = [
  "enemy_nameplate",
  "friendly_nameplate", 
  "enemy_hp_bar",
  "player_hp_bar",
  "loot",
  "mob",
  "player_character",
  "corpse",
  "resource_node",
];

export function useObjectDetection({
  modelUrl,
  confidenceThreshold = 0.5,
  maxDetections = 20,
}: UseObjectDetectionOptions = {}): UseObjectDetectionReturn {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classNames, setClassNames] = useState<string[]>(DEFAULT_CLASS_NAMES);
  
  const modelRef = useRef<tf.GraphModel | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas for frame extraction
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
  }, []);

  const loadModel = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Dispose of previous model if exists
      if (modelRef.current) {
        modelRef.current.dispose();
      }

      console.log("Loading TensorFlow.js model from:", url);
      
      // Set backend to WebGL for GPU acceleration
      await tf.setBackend("webgl");
      await tf.ready();
      
      // Load the model
      const model = await tf.loadGraphModel(url);
      modelRef.current = model;
      
      // Try to load class names from model metadata or accompanying file
      try {
        const labelsUrl = url.replace("model.json", "labels.txt");
        const response = await fetch(labelsUrl);
        if (response.ok) {
          const text = await response.text();
          const labels = text.split("\n").filter(l => l.trim());
          if (labels.length > 0) {
            setClassNames(labels);
          }
        }
      } catch {
        console.log("Using default class names");
      }

      setIsModelLoaded(true);
      console.log("Model loaded successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load model";
      console.error("Model loading error:", err);
      setError(message);
      setIsModelLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load model if URL provided
  useEffect(() => {
    if (modelUrl && !isModelLoaded && !isLoading) {
      loadModel(modelUrl);
    }
  }, [modelUrl, isModelLoaded, isLoading, loadModel]);

  const runInference = useCallback(async (video: HTMLVideoElement): Promise<Detection[]> => {
    if (!modelRef.current || !canvasRef.current) {
      return [];
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0);

    try {
      // Convert to tensor
      const inputTensor = tf.tidy(() => {
        const img = tf.browser.fromPixels(canvas);
        // Resize to model input size (typically 640x640 for YOLO)
        const resized = tf.image.resizeBilinear(img, [640, 640]);
        // Normalize to 0-1
        const normalized = resized.div(255.0);
        // Add batch dimension
        return normalized.expandDims(0);
      });

      // Run inference
      const predictions = await modelRef.current.predict(inputTensor) as tf.Tensor | tf.Tensor[];
      
      // Clean up input tensor
      inputTensor.dispose();

      // Parse predictions (format depends on model export)
      const detections = await parseYOLOOutput(
        predictions,
        canvas.width,
        canvas.height,
        confidenceThreshold,
        maxDetections,
        classNames
      );

      // Clean up prediction tensors
      if (Array.isArray(predictions)) {
        predictions.forEach(t => t.dispose());
      } else {
        predictions.dispose();
      }

      return detections;
    } catch (err) {
      console.error("Inference error:", err);
      return [];
    }
  }, [confidenceThreshold, maxDetections, classNames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);

  return {
    isModelLoaded,
    isLoading,
    error,
    loadModel,
    runInference,
    classNames,
  };
}

// Parse YOLO output format
async function parseYOLOOutput(
  predictions: tf.Tensor | tf.Tensor[],
  imgWidth: number,
  imgHeight: number,
  confidenceThreshold: number,
  maxDetections: number,
  classNames: string[]
): Promise<Detection[]> {
  const detections: Detection[] = [];

  try {
    // Handle different output formats
    let outputData: Float32Array;
    let outputShape: number[];

    if (Array.isArray(predictions)) {
      // Multiple outputs - typically [boxes, scores, classes, num_detections]
      // or just detection output
      const mainOutput = predictions[0];
      outputData = await mainOutput.data() as Float32Array;
      outputShape = mainOutput.shape;
    } else {
      outputData = await predictions.data() as Float32Array;
      outputShape = predictions.shape;
    }

    // Common YOLO output shapes:
    // [1, num_detections, 6] where each detection is [x, y, w, h, confidence, class]
    // [1, num_classes + 5, num_anchors] transposed format
    
    const numDetections = outputShape[1] || 0;
    const detectionSize = outputShape[2] || 6;

    if (detectionSize >= 5) {
      // Standard format: [x, y, w, h, conf, ...class_scores]
      for (let i = 0; i < numDetections && detections.length < maxDetections; i++) {
        const offset = i * detectionSize;
        
        // Coordinates (normalized 0-1)
        const x = outputData[offset];
        const y = outputData[offset + 1];
        const w = outputData[offset + 2];
        const h = outputData[offset + 3];
        
        // Get confidence and class
        let confidence: number;
        let classId: number;
        
        if (detectionSize === 6) {
          // [x, y, w, h, conf, class]
          confidence = outputData[offset + 4];
          classId = Math.round(outputData[offset + 5]);
        } else {
          // [x, y, w, h, obj_conf, ...class_scores]
          const objConf = outputData[offset + 4];
          let maxClassScore = 0;
          classId = 0;
          
          for (let c = 0; c < classNames.length; c++) {
            const score = outputData[offset + 5 + c];
            if (score > maxClassScore) {
              maxClassScore = score;
              classId = c;
            }
          }
          confidence = objConf * maxClassScore;
        }

        if (confidence >= confidenceThreshold) {
          // Convert from center format to corner format and normalize to percentage
          const boxX = ((x - w / 2) / 640) * 100;
          const boxY = ((y - h / 2) / 640) * 100;
          const boxW = (w / 640) * 100;
          const boxH = (h / 640) * 100;

          detections.push({
            id: i,
            type: classNames[classId] || `class_${classId}`,
            x: Math.max(0, Math.min(100 - boxW, boxX)),
            y: Math.max(0, Math.min(100 - boxH, boxY)),
            width: boxW,
            height: boxH,
            confidence: confidence * 100,
          });
        }
      }
    }
  } catch (err) {
    console.error("Error parsing YOLO output:", err);
  }

  // Sort by confidence and return top detections
  return detections
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxDetections);
}
