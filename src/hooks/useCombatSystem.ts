import { useState, useCallback, useRef, useEffect } from "react";

// Detection from Roboflow
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

// Combat states
export type CombatState = 
  | "idle" 
  | "searching" 
  | "approaching" 
  | "combat" 
  | "looting" 
  | "healing" 
  | "kiting" 
  | "aoe";

// Target with priority score
export interface PrioritizedTarget {
  detection: Detection;
  priority: number;
  distance: number;
  estimatedHp?: number;
  threatLevel: "low" | "medium" | "high";
}

// Skill definition
export interface Skill {
  id: string;
  name: string;
  keybind: string;
  cooldown: number; // in milliseconds
  lastUsed: number;
  priority: number; // higher = use first
  isAoe: boolean;
  minTargets?: number; // for AoE skills
  range: number; // in pixels
}

// Combat configuration
export interface CombatConfig {
  // Target Prioritization
  priorityWeights: {
    distance: number;
    hp: number;
    type: number;
    threat: number;
  };
  preferredTargetTypes: string[];
  maxTargetDistance: number;
  
  // AoE Settings
  aoeThreshold: number; // minimum enemies for AoE
  aoeRadius: number;
  
  // Combat Behavior
  combatRange: number;
  pullRange: number;
  healThreshold: number; // HP percentage
  kiteEnabled: boolean;
  kiteDistance: number;
  
  // Looting
  autoLoot: boolean;
  lootDelay: number;
}

const DEFAULT_CONFIG: CombatConfig = {
  priorityWeights: {
    distance: 0.3,
    hp: 0.3,
    type: 0.25,
    threat: 0.15,
  },
  preferredTargetTypes: ["enemy_nameplate", "mob"],
  maxTargetDistance: 500,
  aoeThreshold: 3,
  aoeRadius: 150,
  combatRange: 100,
  pullRange: 300,
  healThreshold: 30,
  kiteEnabled: true,
  kiteDistance: 200,
  autoLoot: true,
  lootDelay: 500,
};

// Default skill rotation
const DEFAULT_SKILLS: Skill[] = [
  { id: "1", name: "Hauptangriff", keybind: "1", cooldown: 0, lastUsed: 0, priority: 1, isAoe: false, range: 100 },
  { id: "2", name: "Starker Angriff", keybind: "2", cooldown: 5000, lastUsed: 0, priority: 2, isAoe: false, range: 100 },
  { id: "3", name: "AoE Skill", keybind: "3", cooldown: 10000, lastUsed: 0, priority: 3, isAoe: true, minTargets: 3, range: 150 },
  { id: "4", name: "Buff", keybind: "4", cooldown: 30000, lastUsed: 0, priority: 4, isAoe: false, range: 0 },
  { id: "5", name: "Heal", keybind: "5", cooldown: 15000, lastUsed: 0, priority: 10, isAoe: false, range: 0 },
];

interface CombatAction {
  type: "skill" | "move" | "target" | "loot" | "wait";
  skill?: Skill;
  target?: PrioritizedTarget;
  direction?: { x: number; y: number };
  reason: string;
}

interface UseCombatSystemReturn {
  // State
  combatState: CombatState;
  currentTarget: PrioritizedTarget | null;
  nearbyTargets: PrioritizedTarget[];
  lastAction: CombatAction | null;
  skills: Skill[];
  config: CombatConfig;
  
  // Stats
  combatStats: {
    killCount: number;
    damageDealt: number;
    skillsUsed: number;
    aoeHits: number;
  };
  
  // Actions
  processFrame: (detections: Detection[], playerHp?: number, screenCenter?: { x: number; y: number }) => CombatAction | null;
  updateConfig: (config: Partial<CombatConfig>) => void;
  updateSkills: (skills: Skill[]) => void;
  resetStats: () => void;
  forceState: (state: CombatState) => void;
}

export function useCombatSystem(): UseCombatSystemReturn {
  const [combatState, setCombatState] = useState<CombatState>("idle");
  const [currentTarget, setCurrentTarget] = useState<PrioritizedTarget | null>(null);
  const [nearbyTargets, setNearbyTargets] = useState<PrioritizedTarget[]>([]);
  const [lastAction, setLastAction] = useState<CombatAction | null>(null);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [config, setConfig] = useState<CombatConfig>(DEFAULT_CONFIG);
  const [combatStats, setCombatStats] = useState({
    killCount: 0,
    damageDealt: 0,
    skillsUsed: 0,
    aoeHits: 0,
  });

  const stateTimerRef = useRef<number>(0);
  const lastStateChangeRef = useRef<number>(Date.now());

  // Calculate distance from screen center
  const calculateDistance = useCallback((detection: Detection, screenCenter: { x: number; y: number }) => {
    const targetX = detection.centerX ?? (detection.x + detection.width / 2);
    const targetY = detection.centerY ?? (detection.y + detection.height / 2);
    return Math.sqrt(
      Math.pow(targetX - screenCenter.x, 2) + 
      Math.pow(targetY - screenCenter.y, 2)
    );
  }, []);

  // Calculate priority score for a target
  const calculatePriority = useCallback((
    detection: Detection, 
    distance: number, 
    config: CombatConfig
  ): number => {
    const { priorityWeights, preferredTargetTypes, maxTargetDistance } = config;
    
    // Distance score (closer = higher)
    const distanceScore = 1 - Math.min(distance / maxTargetDistance, 1);
    
    // Type score (preferred types get higher score)
    const typeIndex = preferredTargetTypes.indexOf(detection.type);
    const typeScore = typeIndex >= 0 ? 1 - (typeIndex / preferredTargetTypes.length) : 0.1;
    
    // HP score (lower HP = higher priority) - estimate from detection size or assume full
    const hpScore = 0.5; // TODO: Implement HP detection
    
    // Threat score based on type
    let threatScore = 0.5;
    if (detection.type.includes("elite") || detection.type.includes("boss")) {
      threatScore = 1.0;
    } else if (detection.type.includes("add") || detection.type.includes("minion")) {
      threatScore = 0.3;
    }
    
    return (
      distanceScore * priorityWeights.distance +
      hpScore * priorityWeights.hp +
      typeScore * priorityWeights.type +
      threatScore * priorityWeights.threat
    );
  }, []);

  // Prioritize targets from detections
  const prioritizeTargets = useCallback((
    detections: Detection[],
    screenCenter: { x: number; y: number }
  ): PrioritizedTarget[] => {
    const enemyTypes = ["enemy_nameplate", "mob", "enemy", "hostile"];
    
    const enemies = detections.filter(d => 
      enemyTypes.some(type => d.type.toLowerCase().includes(type.toLowerCase()))
    );

    return enemies
      .map(detection => {
        const distance = calculateDistance(detection, screenCenter);
        const priority = calculatePriority(detection, distance, config);
        
        let threatLevel: "low" | "medium" | "high" = "medium";
        if (detection.type.includes("elite") || detection.type.includes("boss")) {
          threatLevel = "high";
        } else if (distance > config.maxTargetDistance * 0.7) {
          threatLevel = "low";
        }

        return {
          detection,
          priority,
          distance,
          threatLevel,
        };
      })
      .filter(t => t.distance <= config.maxTargetDistance)
      .sort((a, b) => b.priority - a.priority);
  }, [calculateDistance, calculatePriority, config]);

  // Get available skill (off cooldown)
  const getAvailableSkill = useCallback((
    isAoeNeeded: boolean = false,
    nearbyCount: number = 1
  ): Skill | null => {
    const now = Date.now();
    
    const availableSkills = skills
      .filter(skill => {
        // Check cooldown
        if (now - skill.lastUsed < skill.cooldown) return false;
        
        // If AoE needed, prefer AoE skills with enough targets
        if (isAoeNeeded && skill.isAoe) {
          return !skill.minTargets || nearbyCount >= skill.minTargets;
        }
        
        // Skip AoE skills when single target
        if (!isAoeNeeded && skill.isAoe && skill.minTargets) return false;
        
        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    return availableSkills[0] || null;
  }, [skills]);

  // Check for AoE opportunity
  const checkAoeOpportunity = useCallback((targets: PrioritizedTarget[]): boolean => {
    if (targets.length < config.aoeThreshold) return false;

    // Check if enemies are clustered
    const centerX = targets.reduce((sum, t) => sum + (t.detection.centerX ?? 0), 0) / targets.length;
    const centerY = targets.reduce((sum, t) => sum + (t.detection.centerY ?? 0), 0) / targets.length;

    const inRangeCount = targets.filter(t => {
      const dx = (t.detection.centerX ?? 0) - centerX;
      const dy = (t.detection.centerY ?? 0) - centerY;
      return Math.sqrt(dx * dx + dy * dy) <= config.aoeRadius;
    }).length;

    return inRangeCount >= config.aoeThreshold;
  }, [config.aoeThreshold, config.aoeRadius]);

  // Main frame processing logic
  const processFrame = useCallback((
    detections: Detection[],
    playerHp: number = 100,
    screenCenter: { x: number; y: number } = { x: 50, y: 50 }
  ): CombatAction | null => {
    const now = Date.now();
    
    // Prioritize all visible targets
    const prioritizedTargets = prioritizeTargets(detections, screenCenter);
    setNearbyTargets(prioritizedTargets);

    // Check for loot
    const lootItems = detections.filter(d => 
      d.type.toLowerCase().includes("loot") || d.type.toLowerCase().includes("corpse")
    );

    // State machine logic
    let newState: CombatState = combatState;
    let action: CombatAction | null = null;

    // Priority 1: Heal if low HP
    if (playerHp <= config.healThreshold) {
      const healSkill = skills.find(s => s.name.toLowerCase().includes("heal") && now - s.lastUsed >= s.cooldown);
      if (healSkill) {
        newState = "healing";
        action = { type: "skill", skill: healSkill, reason: `HP kritisch (${playerHp}%), heile` };
      }
    }

    // Priority 2: Combat logic
    if (!action && prioritizedTargets.length > 0) {
      const topTarget = prioritizedTargets[0];
      const isAoeOpportunity = checkAoeOpportunity(prioritizedTargets);

      // Update current target
      if (!currentTarget || topTarget.priority > currentTarget.priority * 1.2) {
        setCurrentTarget(topTarget);
      }

      if (topTarget.distance > config.combatRange) {
        // Target out of range - approach
        newState = "approaching";
        action = {
          type: "move",
          target: topTarget,
          direction: { x: topTarget.detection.centerX ?? 0, y: topTarget.detection.centerY ?? 0 },
          reason: `Nähert sich ${topTarget.detection.type} (${topTarget.distance.toFixed(0)}px entfernt)`,
        };
      } else if (isAoeOpportunity) {
        // Multiple enemies in range - AoE
        newState = "aoe";
        const aoeSkill = getAvailableSkill(true, prioritizedTargets.length);
        if (aoeSkill) {
          action = {
            type: "skill",
            skill: aoeSkill,
            reason: `AoE auf ${prioritizedTargets.length} Ziele`,
          };
          setCombatStats(prev => ({ ...prev, aoeHits: prev.aoeHits + prioritizedTargets.length }));
        }
      } else if (config.kiteEnabled && topTarget.threatLevel === "high" && topTarget.distance < config.kiteDistance) {
        // High threat target too close - kite
        newState = "kiting";
        action = {
          type: "move",
          direction: { 
            x: screenCenter.x - (topTarget.detection.centerX ?? 0), 
            y: screenCenter.y - (topTarget.detection.centerY ?? 0) 
          },
          reason: `Kiting von ${topTarget.detection.type} (Threat: ${topTarget.threatLevel})`,
        };
      } else {
        // In range - attack
        newState = "combat";
        const skill = getAvailableSkill(false, 1);
        if (skill) {
          action = {
            type: "skill",
            skill: skill,
            target: topTarget,
            reason: `Benutze ${skill.name} auf ${topTarget.detection.type}`,
          };
          setCombatStats(prev => ({ ...prev, skillsUsed: prev.skillsUsed + 1 }));
        }
      }
    } else if (!action && lootItems.length > 0 && config.autoLoot) {
      // No enemies - loot
      newState = "looting";
      action = {
        type: "loot",
        reason: `Sammle ${lootItems.length} Loot-Items`,
      };
    } else if (!action) {
      // Nothing to do - search
      if (prioritizedTargets.length === 0) {
        newState = "searching";
        action = { type: "wait", reason: "Suche nach Zielen..." };
      } else {
        newState = "idle";
        setCurrentTarget(null);
      }
    }

    // Update state if changed
    if (newState !== combatState) {
      setCombatState(newState);
      lastStateChangeRef.current = now;
    }

    // Mark skill as used
    if (action?.skill) {
      setSkills(prev => prev.map(s => 
        s.id === action!.skill!.id ? { ...s, lastUsed: now } : s
      ));
    }

    setLastAction(action);
    return action;
  }, [
    combatState, 
    currentTarget, 
    config, 
    skills, 
    prioritizeTargets, 
    checkAoeOpportunity, 
    getAvailableSkill
  ]);

  const updateConfig = useCallback((newConfig: Partial<CombatConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const updateSkills = useCallback((newSkills: Skill[]) => {
    setSkills(newSkills);
  }, []);

  const resetStats = useCallback(() => {
    setCombatStats({ killCount: 0, damageDealt: 0, skillsUsed: 0, aoeHits: 0 });
  }, []);

  const forceState = useCallback((state: CombatState) => {
    setCombatState(state);
    lastStateChangeRef.current = Date.now();
  }, []);

  return {
    combatState,
    currentTarget,
    nearbyTargets,
    lastAction,
    skills,
    config,
    combatStats,
    processFrame,
    updateConfig,
    updateSkills,
    resetStats,
    forceState,
  };
}
