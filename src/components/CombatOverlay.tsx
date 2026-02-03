import { useEffect, useRef } from "react";
import type { PrioritizedTarget } from "@/hooks/useCombatSystem";

interface CombatOverlayProps {
  currentTarget: PrioritizedTarget | null;
  nearbyTargets: PrioritizedTarget[];
  dangerZones: { x: number; y: number; radius: number; mobCount: number }[];
  playerPosition: { x: number; y: number } | null;
  screenCenter: { x: number; y: number };
  safetyDistance: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function CombatOverlay({
  currentTarget,
  nearbyTargets,
  dangerZones,
  playerPosition,
  screenCenter,
  safetyDistance,
  containerRef,
}: CombatOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Convert percentage to pixels
    const toPixels = (percentX: number, percentY: number) => ({
      x: (percentX / 100) * canvas.width,
      y: (percentY / 100) * canvas.height,
    });

    // Get player/center position in pixels
    const centerPos = toPixels(screenCenter.x, screenCenter.y);

    // Draw safety radius around player
    if (safetyDistance > 0) {
      const radiusPx = (safetyDistance / 100) * canvas.width;
      ctx.beginPath();
      ctx.arc(centerPos.x, centerPos.y, radiusPx, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.3)"; // primary blue
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Fill with very light color
      ctx.fillStyle = "rgba(59, 130, 246, 0.05)";
      ctx.fill();
    }

    // Draw danger zones
    dangerZones.forEach(zone => {
      const zonePos = toPixels(
        (zone.x / canvas.width) * 100,
        (zone.y / canvas.height) * 100
      );
      const radiusPx = (zone.radius / 100) * canvas.width;

      // Red danger zone circle
      ctx.beginPath();
      ctx.arc(zonePos.x, zonePos.y, radiusPx, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)"; // destructive red
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Fill with semi-transparent red
      ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
      ctx.fill();

      // Draw mob count label
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
      ctx.textAlign = "center";
      ctx.fillText(`${zone.mobCount} MOBS`, zonePos.x, zonePos.y);
    });

    // Draw lines to all nearby targets (thin, faded)
    nearbyTargets.forEach(target => {
      if (target.detection.id === currentTarget?.detection.id) return;
      
      const targetX = target.detection.x + target.detection.width / 2;
      const targetY = target.detection.y + target.detection.height / 2;
      const targetPos = toPixels(targetX, targetY);

      ctx.beginPath();
      ctx.moveTo(centerPos.x, centerPos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      
      // Color based on isolation status
      if (target.isInDangerZone) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.3)"; // red
      } else if (target.isIsolated) {
        ctx.strokeStyle = "rgba(34, 197, 94, 0.3)"; // green
      } else {
        ctx.strokeStyle = "rgba(234, 179, 8, 0.3)"; // yellow
      }
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw line to primary target (thick, prominent)
    if (currentTarget) {
      const targetX = currentTarget.detection.x + currentTarget.detection.width / 2;
      const targetY = currentTarget.detection.y + currentTarget.detection.height / 2;
      const targetPos = toPixels(targetX, targetY);

      // Glow effect
      ctx.beginPath();
      ctx.moveTo(centerPos.x, centerPos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.strokeStyle = currentTarget.isIsolated 
        ? "rgba(34, 197, 94, 0.8)" // green for isolated
        : "rgba(234, 179, 8, 0.8)"; // yellow for grouped
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner line
      ctx.beginPath();
      ctx.moveTo(centerPos.x, centerPos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.strokeStyle = currentTarget.isIsolated 
        ? "rgba(134, 239, 172, 1)" 
        : "rgba(253, 224, 71, 1)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Target crosshair
      const crosshairSize = 10;
      ctx.beginPath();
      ctx.moveTo(targetPos.x - crosshairSize, targetPos.y);
      ctx.lineTo(targetPos.x + crosshairSize, targetPos.y);
      ctx.moveTo(targetPos.x, targetPos.y - crosshairSize);
      ctx.lineTo(targetPos.x, targetPos.y + crosshairSize);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

  }, [currentTarget, nearbyTargets, dangerZones, playerPosition, screenCenter, safetyDistance, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
