import { useState, useCallback, useMemo } from "react";
import type { Detection } from "./useRoboflowInference";

export interface VisionState {
  // Player stats from detection
  playerHp: number;
  playerMana: number;
  
  // Detected entities
  enemies: Detection[];
  resources: Detection[];
  loot: Detection[];
  
  // Screen state
  isStreamActive: boolean;
  lastFrameTime: number;
  fps: number;
  
  // Inference status
  status: "idle" | "waiting_stream" | "loading_model" | "inferencing" | "ready" | "error";
  errorMessage: string | null;
}

interface UseVisionStateReturn {
  state: VisionState;
  
  // Update functions
  updateFromDetections: (detections: Detection[]) => void;
  setStreamActive: (active: boolean) => void;
  setStatus: (status: VisionState["status"], error?: string) => void;
  updateFps: (fps: number) => void;
  reset: () => void;
}

const DEFAULT_STATE: VisionState = {
  playerHp: 100,
  playerMana: 100,
  enemies: [],
  resources: [],
  loot: [],
  isStreamActive: false,
  lastFrameTime: 0,
  fps: 0,
  status: "idle",
  errorMessage: null,
};

// Detection type mappings
const ENEMY_TYPES = ["enemy", "enemy_nameplate", "hostile", "mob"];
const RESOURCE_TYPES = ["ore", "herb", "resource", "resource_node"];
const LOOT_TYPES = ["loot", "item", "corpse"];
const HP_TYPES = ["our-hp", "our_hp", "player_hp", "player-hp", "player_hp_bar"];
const MANA_TYPES = ["mana", "player_mana", "our-mana", "our_mana"];

export function useVisionState(): UseVisionStateReturn {
  const [state, setState] = useState<VisionState>(DEFAULT_STATE);

  // Extract HP value from detection (based on bounding box width/position)
  const extractHpFromDetection = useCallback((detection: Detection): number => {
    // HP bar width typically represents fill percentage
    // Assuming the detection width relative to a standard HP bar represents HP %
    // This is a simplified heuristic - actual implementation may need calibration
    if (detection.width > 0) {
      // If the detection has raw pixel data, use it
      if (detection.rawWidth) {
        // Assume max HP bar width is around 200-300 pixels for WoW
        const maxBarWidth = 250;
        return Math.min(100, (detection.rawWidth / maxBarWidth) * 100);
      }
      // Fallback: use percentage width (assuming detection.width is 0-100%)
      return Math.min(100, detection.width);
    }
    return 100;
  }, []);

  // Extract mana value similarly
  const extractManaFromDetection = useCallback((detection: Detection): number => {
    if (detection.width > 0) {
      if (detection.rawWidth) {
        const maxBarWidth = 250;
        return Math.min(100, (detection.rawWidth / maxBarWidth) * 100);
      }
      return Math.min(100, detection.width);
    }
    return 100;
  }, []);

  // Match detection type to category
  const matchesType = useCallback((detectionType: string, types: string[]): boolean => {
    const lower = detectionType.toLowerCase();
    return types.some(t => lower.includes(t.toLowerCase()));
  }, []);

  // Process detections and update state
  const updateFromDetections = useCallback((detections: Detection[]) => {
    setState(prev => {
      const enemies: Detection[] = [];
      const resources: Detection[] = [];
      const loot: Detection[] = [];
      let newHp = prev.playerHp;
      let newMana = prev.playerMana;

      for (const det of detections) {
        const type = det.type.toLowerCase();

        // Check HP
        if (matchesType(type, HP_TYPES)) {
          newHp = extractHpFromDetection(det);
          continue;
        }

        // Check Mana
        if (matchesType(type, MANA_TYPES)) {
          newMana = extractManaFromDetection(det);
          continue;
        }

        // Categorize entities
        if (matchesType(type, ENEMY_TYPES)) {
          enemies.push(det);
        } else if (matchesType(type, RESOURCE_TYPES)) {
          resources.push(det);
        } else if (matchesType(type, LOOT_TYPES)) {
          loot.push(det);
        }
      }

      return {
        ...prev,
        playerHp: newHp,
        playerMana: newMana,
        enemies,
        resources,
        loot,
        lastFrameTime: Date.now(),
      };
    });
  }, [matchesType, extractHpFromDetection, extractManaFromDetection]);

  const setStreamActive = useCallback((active: boolean) => {
    setState(prev => ({
      ...prev,
      isStreamActive: active,
      status: active ? "waiting_stream" : "idle",
      errorMessage: null,
    }));
  }, []);

  const setStatus = useCallback((status: VisionState["status"], error?: string) => {
    setState(prev => ({
      ...prev,
      status,
      errorMessage: error || null,
    }));
  }, []);

  const updateFps = useCallback((fps: number) => {
    setState(prev => ({ ...prev, fps }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return useMemo(() => ({
    state,
    updateFromDetections,
    setStreamActive,
    setStatus,
    updateFps,
    reset,
  }), [state, updateFromDetections, setStreamActive, setStatus, updateFps, reset]);
}

// Status message helper
export function getStatusMessage(status: VisionState["status"]): string {
  switch (status) {
    case "idle":
      return "Bereit zum Starten";
    case "waiting_stream":
      return "Warte auf Video-Stream...";
    case "loading_model":
      return "Lade Roboflow Modell...";
    case "inferencing":
      return "Analysiere Frame...";
    case "ready":
      return "Vision aktiv";
    case "error":
      return "Fehler aufgetreten";
    default:
      return "";
  }
}
