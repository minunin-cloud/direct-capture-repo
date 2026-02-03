import { useState, useCallback, useRef, useEffect } from "react";
import { useActionService } from "./useActionService";
import { useCoordinateMapping } from "./useCoordinateMapping";

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
  | "aoe"
  | "avoiding";

// Target with priority score and group info
export interface PrioritizedTarget {
  detection: Detection;
  priority: number;
  distance: number;
  estimatedHp?: number;
  threatLevel: "low" | "medium" | "high";
  neighborCount: number;
  isInDangerZone: boolean;
  isIsolated: boolean;
}

// Skill definition
export interface Skill {
  id: string;
  name: string;
  keybind: string;
  cooldown: number;
  lastUsed: number;
  priority: number;
  isAoe: boolean;
  minTargets?: number;
  range: number;
}

// Combat configuration
export interface CombatConfig {
  // Target Prioritization
  priorityWeights: {
    distance: number;
    hp: number;
    type: number;
    threat: number;
    isolation: number;
  };
  preferredTargetTypes: string[];
  maxTargetDistance: number;
  
  // Group Avoidance - CORE FEATURE
  mobDensityThreshold: number; // Max allowed neighbors
  safetyDistance: number; // Radius for group detection
  avoidDangerZones: boolean;
  
  // Combat Range
  minAttackRange: number;
  maxAttackRange: number;
  
  // AoE Settings
  aoeThreshold: number;
  aoeRadius: number;
  
  // Combat Behavior
  combatEnabled: boolean;
  pullRange: number;
  healThreshold: number;
  kiteEnabled: boolean;
  kiteDistance: number;
  
  // Movement
  stuckTimeout: number; // ms before jump
  
  // Looting
  autoLoot: boolean;
  lootDelay: number;
}

const DEFAULT_CONFIG: CombatConfig = {
  priorityWeights: {
    distance: 0.2,
    hp: 0.2,
    type: 0.2,
    threat: 0.15,
    isolation: 0.25, // High weight for isolated targets
  },
  preferredTargetTypes: ["enemy_nameplate", "mob", "enemy"],
  maxTargetDistance: 500,
  
  // Group Avoidance
  mobDensityThreshold: 2,
  safetyDistance: 150,
  avoidDangerZones: true,
  
  // Combat Range
  minAttackRange: 30,
  maxAttackRange: 100,
  
  aoeThreshold: 3,
  aoeRadius: 150,
  combatEnabled: false,
  pullRange: 300,
  healThreshold: 30,
  kiteEnabled: true,
  kiteDistance: 200,
  stuckTimeout: 2000,
  autoLoot: true,
  lootDelay: 500,
};

const DEFAULT_SKILLS: Skill[] = [
  { id: "1", name: "Hauptangriff", keybind: "1", cooldown: 0, lastUsed: 0, priority: 1, isAoe: false, range: 100 },
  { id: "2", name: "Starker Angriff", keybind: "2", cooldown: 5000, lastUsed: 0, priority: 2, isAoe: false, range: 100 },
  { id: "3", name: "AoE Skill", keybind: "3", cooldown: 10000, lastUsed: 0, priority: 3, isAoe: true, minTargets: 3, range: 150 },
  { id: "4", name: "Buff", keybind: "4", cooldown: 30000, lastUsed: 0, priority: 4, isAoe: false, range: 0 },
  { id: "5", name: "Heal", keybind: "5", cooldown: 15000, lastUsed: 0, priority: 10, isAoe: false, range: 0 },
];

interface CombatAction {
  type: "skill" | "move" | "target" | "loot" | "wait" | "jump";
  skill?: Skill;
  target?: PrioritizedTarget;
  direction?: { x: number; y: number };
  key?: string;
  reason: string;
}

interface PlayerPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface UseCombatSystemReturn {
  // State
  combatState: CombatState;
  currentTarget: PrioritizedTarget | null;
  nearbyTargets: PrioritizedTarget[];
  dangerZones: { x: number; y: number; radius: number; mobCount: number }[];
  lastAction: CombatAction | null;
  skills: Skill[];
  config: CombatConfig;
  
  // Player tracking
  playerPosition: PlayerPosition | null;
  screenCenter: { x: number; y: number };
  
  // Stats
  combatStats: {
    killCount: number;
    damageDealt: number;
    skillsUsed: number;
    aoeHits: number;
    dangersAvoided: number;
  };
  
  // Services
  actionService: ReturnType<typeof useActionService>;
  coordinateMapping: ReturnType<typeof useCoordinateMapping>;
  
  // Actions
  processFrame: (
    detections: Detection[], 
    video: HTMLVideoElement, 
    container: HTMLElement,
    playerHp?: number
  ) => CombatAction | null;
  updateConfig: (config: Partial<CombatConfig>) => void;
  updateSkills: (skills: Skill[]) => void;
  resetStats: () => void;
  forceState: (state: CombatState) => void;
  setScreenCenter: (center: { x: number; y: number }) => void;
}

export function useCombatSystem(): UseCombatSystemReturn {
  const [combatState, setCombatState] = useState<CombatState>("idle");
  const [currentTarget, setCurrentTarget] = useState<PrioritizedTarget | null>(null);
  const [nearbyTargets, setNearbyTargets] = useState<PrioritizedTarget[]>([]);
  const [dangerZones, setDangerZones] = useState<{ x: number; y: number; radius: number; mobCount: number }[]>([]);
  const [lastAction, setLastAction] = useState<CombatAction | null>(null);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [config, setConfig] = useState<CombatConfig>(DEFAULT_CONFIG);
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition | null>(null);
  const [screenCenter, setScreenCenter] = useState({ x: 50, y: 50 });
  const [combatStats, setCombatStats] = useState({
    killCount: 0,
    damageDealt: 0,
    skillsUsed: 0,
    aoeHits: 0,
    dangersAvoided: 0,
  });

  const lastStateChangeRef = useRef<number>(Date.now());
  const lastPositionRef = useRef<PlayerPosition | null>(null);
  const stuckTimerRef = useRef<number>(0);
  const previousTargetsRef = useRef<Set<number>>(new Set());

  const actionService = useActionService();
  const coordinateMapping = useCoordinateMapping();

  // Track kills when targets disappear
  const trackKills = useCallback((currentDetections: Detection[]) => {
    const currentIds = new Set(currentDetections.map(d => d.id));
    const previousIds = previousTargetsRef.current;
    
    // Count how many previous targets are now missing (killed)
    let newKills = 0;
    previousIds.forEach(id => {
      if (!currentIds.has(id)) {
        newKills++;
      }
    });
    
    if (newKills > 0) {
      setCombatStats(prev => ({
        ...prev,
        killCount: prev.killCount + newKills,
      }));
    }
    
    // Update previous targets ref
    previousTargetsRef.current = currentIds;
  }, []);

  // Calculate distance between two points
  const calculateDistance = useCallback((
    x1: number, y1: number, x2: number, y2: number
  ): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }, []);

  // Count neighbors within safety distance for a detection
  const countNeighbors = useCallback((
    detection: Detection,
    allDetections: Detection[],
    safetyDistance: number
  ): number => {
    const centerX = detection.centerX ?? (detection.x + detection.width / 2);
    const centerY = detection.centerY ?? (detection.y + detection.height / 2);
    
    return allDetections.filter(other => {
      if (other.id === detection.id) return false;
      const otherX = other.centerX ?? (other.x + other.width / 2);
      const otherY = other.centerY ?? (other.y + other.height / 2);
      return calculateDistance(centerX, centerY, otherX, otherY) <= safetyDistance;
    }).length;
  }, [calculateDistance]);

  // Detect danger zones (groups of enemies)
  const detectDangerZones = useCallback((
    enemies: Detection[],
    safetyDistance: number,
    densityThreshold: number
  ): { x: number; y: number; radius: number; mobCount: number }[] => {
    const zones: { x: number; y: number; radius: number; mobCount: number }[] = [];
    const processed = new Set<number>();

    enemies.forEach(enemy => {
      if (processed.has(enemy.id)) return;
      
      const centerX = enemy.centerX ?? (enemy.x + enemy.width / 2);
      const centerY = enemy.centerY ?? (enemy.y + enemy.height / 2);
      
      // Find all enemies within safety distance
      const cluster = enemies.filter(other => {
        const otherX = other.centerX ?? (other.x + other.width / 2);
        const otherY = other.centerY ?? (other.y + other.height / 2);
        return calculateDistance(centerX, centerY, otherX, otherY) <= safetyDistance;
      });

      if (cluster.length > densityThreshold) {
        // Calculate cluster center
        const avgX = cluster.reduce((sum, e) => sum + (e.centerX ?? (e.x + e.width / 2)), 0) / cluster.length;
        const avgY = cluster.reduce((sum, e) => sum + (e.centerY ?? (e.y + e.height / 2)), 0) / cluster.length;
        
        zones.push({
          x: avgX,
          y: avgY,
          radius: safetyDistance,
          mobCount: cluster.length,
        });

        cluster.forEach(e => processed.add(e.id));
      }
    });

    return zones;
  }, [calculateDistance]);

  // Calculate priority score with isolation bonus
  const calculatePriority = useCallback((
    detection: Detection, 
    distance: number,
    neighborCount: number,
    config: CombatConfig
  ): number => {
    const { priorityWeights, preferredTargetTypes, maxTargetDistance, mobDensityThreshold } = config;
    
    // Distance score (closer = higher)
    const distanceScore = 1 - Math.min(distance / maxTargetDistance, 1);
    
    // Type score
    const typeIndex = preferredTargetTypes.indexOf(detection.type.toLowerCase());
    const typeScore = typeIndex >= 0 ? 1 - (typeIndex / preferredTargetTypes.length) : 0.1;
    
    // HP score (placeholder)
    const hpScore = 0.5;
    
    // Threat score
    let threatScore = 0.5;
    if (detection.type.includes("elite") || detection.type.includes("boss")) {
      threatScore = 1.0;
    } else if (detection.type.includes("add") || detection.type.includes("minion")) {
      threatScore = 0.3;
    }
    
    // ISOLATION SCORE - Core feature
    // Isolated targets get maximum score, grouped targets get penalized
    const isolationScore = neighborCount <= 1 ? 1.0 : 
                          neighborCount <= mobDensityThreshold ? 0.5 : 0.1;
    
    return (
      distanceScore * priorityWeights.distance +
      hpScore * priorityWeights.hp +
      typeScore * priorityWeights.type +
      threatScore * priorityWeights.threat +
      isolationScore * priorityWeights.isolation
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

    // Detect danger zones first
    const zones = detectDangerZones(enemies, config.safetyDistance, config.mobDensityThreshold);
    setDangerZones(zones);

    return enemies
      .map(detection => {
        const centerX = detection.centerX ?? (detection.x + detection.width / 2);
        const centerY = detection.centerY ?? (detection.y + detection.height / 2);
        const distance = calculateDistance(centerX, centerY, screenCenter.x, screenCenter.y);
        const neighborCount = countNeighbors(detection, enemies, config.safetyDistance);
        const priority = calculatePriority(detection, distance, neighborCount, config);
        
        // Check if in danger zone
        const isInDangerZone = zones.some(zone => 
          calculateDistance(centerX, centerY, zone.x, zone.y) <= zone.radius
        );
        
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
          neighborCount,
          isInDangerZone,
          isIsolated: neighborCount <= 1,
        };
      })
      .filter(t => t.distance <= config.maxTargetDistance)
      .sort((a, b) => b.priority - a.priority);
  }, [calculateDistance, countNeighbors, calculatePriority, detectDangerZones, config]);

  // Get available skill
  const getAvailableSkill = useCallback((
    isAoeNeeded: boolean = false,
    nearbyCount: number = 1
  ): Skill | null => {
    const now = Date.now();
    
    const availableSkills = skills
      .filter(skill => {
        if (now - skill.lastUsed < skill.cooldown) return false;
        if (isAoeNeeded && skill.isAoe) {
          return !skill.minTargets || nearbyCount >= skill.minTargets;
        }
        if (!isAoeNeeded && skill.isAoe && skill.minTargets) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    return availableSkills[0] || null;
  }, [skills]);

  // Check for stuck condition
  const checkStuck = useCallback((currentPos: { x: number; y: number }): boolean => {
    const now = Date.now();
    
    if (lastPositionRef.current) {
      const movedDistance = calculateDistance(
        currentPos.x, currentPos.y,
        lastPositionRef.current.x, lastPositionRef.current.y
      );
      
      if (movedDistance < 5) {
        // Barely moved
        if (now - stuckTimerRef.current > config.stuckTimeout) {
          return true;
        }
      } else {
        stuckTimerRef.current = now;
      }
    } else {
      stuckTimerRef.current = now;
    }
    
    lastPositionRef.current = { x: currentPos.x, y: currentPos.y, timestamp: now };
    return false;
  }, [calculateDistance, config.stuckTimeout]);

  // Execute action via Python bridge
  const executeAction = useCallback(async (action: CombatAction) => {
    if (!config.combatEnabled) return;

    switch (action.type) {
      case "move":
        if (action.direction) {
          // Determine movement direction
          const dx = action.direction.x - screenCenter.x;
          const dy = action.direction.y - screenCenter.y;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            await actionService.sendKeypress(dx > 0 ? "d" : "a");
          } else {
            await actionService.sendKeypress(dy > 0 ? "s" : "w");
          }
        }
        break;
        
      case "skill":
        if (action.skill) {
          await actionService.sendKeypress(action.skill.keybind);
        }
        break;
        
      case "jump":
        await actionService.sendKeypress("space");
        break;
        
      case "target":
        if (action.target) {
          const metrics = coordinateMapping.getMetrics();
          if (metrics) {
            const normalized = coordinateMapping.detectionToNormalized(action.target.detection, metrics);
            await actionService.sendMove(normalized.x, normalized.y);
          }
        }
        break;
    }
  }, [config.combatEnabled, actionService, coordinateMapping, screenCenter]);

  // Main frame processing logic
  const processFrame = useCallback((
    detections: Detection[],
    video: HTMLVideoElement,
    container: HTMLElement,
    playerHp: number = 100
  ): CombatAction | null => {
    const now = Date.now();
    
    // Update coordinate mapping
    const metrics = coordinateMapping.updateVideoMetrics(video, container);
    
    // Prioritize all visible targets
    const prioritizedTargets = prioritizeTargets(detections, screenCenter);
    setNearbyTargets(prioritizedTargets);
    
    // Track kills - when targets disappear
    const enemyDetections = detections.filter(d => 
      ["enemy_nameplate", "mob", "enemy", "hostile"].some(type => 
        d.type.toLowerCase().includes(type.toLowerCase())
      )
    );
    trackKills(enemyDetections);

    // Find player character for position tracking
    const playerDetection = detections.find(d => 
      d.type.toLowerCase().includes("player") || d.type.toLowerCase().includes("character")
    );
    
    if (playerDetection) {
      const newPos = {
        x: playerDetection.centerX ?? (playerDetection.x + playerDetection.width / 2),
        y: playerDetection.centerY ?? (playerDetection.y + playerDetection.height / 2),
        timestamp: now,
      };
      setPlayerPosition(newPos);
    }

    // Check for loot
    const lootItems = detections.filter(d => 
      d.type.toLowerCase().includes("loot") || d.type.toLowerCase().includes("corpse")
    );

    // Get isolated targets only (unless in danger zone)
    const safeTargets = config.avoidDangerZones 
      ? prioritizedTargets.filter(t => !t.isInDangerZone)
      : prioritizedTargets;

    let newState: CombatState = combatState;
    let action: CombatAction | null = null;

    // Check if player is near danger zone
    const playerNearDanger = dangerZones.some(zone => {
      const playerX = playerPosition?.x ?? screenCenter.x;
      const playerY = playerPosition?.y ?? screenCenter.y;
      return calculateDistance(playerX, playerY, zone.x, zone.y) < zone.radius * 1.5;
    });

    // Priority 0: Check if stuck
    if (combatState === "approaching" && playerPosition) {
      const isStuck = checkStuck({ x: playerPosition.x, y: playerPosition.y });
      if (isStuck) {
        action = { type: "jump", key: "space", reason: "Stuck - Springe!" };
        stuckTimerRef.current = now;
        executeAction(action);
        setLastAction(action);
        return action;
      }
    }

    // Priority 1: Avoid danger zone
    if (playerNearDanger && config.avoidDangerZones) {
      newState = "avoiding";
      const nearestZone = dangerZones[0];
      if (nearestZone) {
        const playerX = playerPosition?.x ?? screenCenter.x;
        const playerY = playerPosition?.y ?? screenCenter.y;
        // Move away from danger
        const escapeX = playerX - (nearestZone.x - playerX);
        const escapeY = playerY - (nearestZone.y - playerY);
        
        action = {
          type: "move",
          direction: { x: escapeX, y: escapeY },
          reason: `Weiche Danger Zone aus (${nearestZone.mobCount} Mobs)`,
        };
        setCombatStats(prev => ({ ...prev, dangersAvoided: prev.dangersAvoided + 1 }));
      }
    }

    // Priority 2: Heal if low HP
    if (!action && playerHp <= config.healThreshold) {
      const healSkill = skills.find(s => 
        s.name.toLowerCase().includes("heal") && now - s.lastUsed >= s.cooldown
      );
      if (healSkill) {
        newState = "healing";
        action = { type: "skill", skill: healSkill, reason: `HP kritisch (${playerHp}%), heile` };
      }
    }

    // Priority 3: Combat logic with safe targets only
    if (!action && safeTargets.length > 0) {
      const topTarget = safeTargets[0];
      const isAoeOpportunity = safeTargets.length >= config.aoeThreshold;

      // Update current target
      if (!currentTarget || topTarget.priority > currentTarget.priority * 1.2) {
        setCurrentTarget(topTarget);
      }

      if (topTarget.distance > config.maxAttackRange) {
        // Target out of range - approach
        newState = "approaching";
        action = {
          type: "move",
          target: topTarget,
          direction: { 
            x: topTarget.detection.centerX ?? (topTarget.detection.x + topTarget.detection.width / 2),
            y: topTarget.detection.centerY ?? (topTarget.detection.y + topTarget.detection.height / 2)
          },
          reason: `Nähert sich ${topTarget.detection.type} (${topTarget.distance.toFixed(0)}px, ${topTarget.isIsolated ? 'isoliert' : topTarget.neighborCount + ' Nachbarn'})`,
        };
      } else if (topTarget.distance < config.minAttackRange && config.kiteEnabled) {
        // Too close - kite back
        newState = "kiting";
        const playerX = playerPosition?.x ?? screenCenter.x;
        const playerY = playerPosition?.y ?? screenCenter.y;
        const targetX = topTarget.detection.centerX ?? (topTarget.detection.x + topTarget.detection.width / 2);
        const targetY = topTarget.detection.centerY ?? (topTarget.detection.y + topTarget.detection.height / 2);
        
        action = {
          type: "move",
          direction: { 
            x: playerX - (targetX - playerX),
            y: playerY - (targetY - playerY)
          },
          reason: `Kiting - Ziel zu nah (${topTarget.distance.toFixed(0)}px)`,
        };
      } else if (isAoeOpportunity && !config.avoidDangerZones) {
        // AoE opportunity (only if not avoiding groups)
        newState = "aoe";
        const aoeSkill = getAvailableSkill(true, safeTargets.length);
        if (aoeSkill) {
          action = {
            type: "skill",
            skill: aoeSkill,
            reason: `AoE auf ${safeTargets.length} Ziele`,
          };
          setCombatStats(prev => ({ ...prev, aoeHits: prev.aoeHits + safeTargets.length }));
        }
      } else {
        // In range - attack
        newState = "combat";
        const skill = getAvailableSkill(false, 1);
        if (skill) {
          action = {
            type: "skill",
            skill: skill,
            target: topTarget,
            reason: `${skill.name} auf ${topTarget.detection.type} (${topTarget.isIsolated ? '★ Isoliert' : topTarget.neighborCount + ' Nachbarn'})`,
          };
          setCombatStats(prev => ({ ...prev, skillsUsed: prev.skillsUsed + 1 }));
        }
      }
    } else if (!action && lootItems.length > 0 && config.autoLoot) {
      // No safe enemies - loot
      newState = "looting";
      action = {
        type: "loot",
        reason: `Sammle ${lootItems.length} Loot-Items`,
      };
    } else if (!action) {
      // Nothing to do
      if (prioritizedTargets.length === 0) {
        newState = "searching";
        action = { type: "wait", reason: "Suche nach Zielen..." };
      } else if (safeTargets.length === 0 && config.avoidDangerZones) {
        newState = "avoiding";
        action = { type: "wait", reason: "Nur Gruppen sichtbar - warte auf isolierte Ziele" };
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

    // Execute action
    if (action && config.combatEnabled) {
      executeAction(action);
    }

    setLastAction(action);
    return action;
  }, [
    combatState, 
    currentTarget,
    playerPosition,
    screenCenter,
    dangerZones,
    config, 
    skills, 
    prioritizeTargets,
    calculateDistance,
    checkStuck,
    getAvailableSkill,
    executeAction,
    coordinateMapping,
    trackKills,
  ]);

  const updateConfig = useCallback((newConfig: Partial<CombatConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const updateSkills = useCallback((newSkills: Skill[]) => {
    setSkills(newSkills);
  }, []);

  const resetStats = useCallback(() => {
    setCombatStats({ killCount: 0, damageDealt: 0, skillsUsed: 0, aoeHits: 0, dangersAvoided: 0 });
  }, []);

  const forceState = useCallback((state: CombatState) => {
    setCombatState(state);
    lastStateChangeRef.current = Date.now();
  }, []);

  return {
    combatState,
    currentTarget,
    nearbyTargets,
    dangerZones,
    lastAction,
    skills,
    config,
    playerPosition,
    screenCenter,
    combatStats,
    actionService,
    coordinateMapping,
    processFrame,
    updateConfig,
    updateSkills,
    resetStats,
    forceState,
    setScreenCenter,
  };
}
