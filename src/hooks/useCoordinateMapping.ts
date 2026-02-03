import { useCallback, useRef } from "react";
import type { Detection } from "./useCombatSystem";

interface VideoMetrics {
  videoWidth: number;
  videoHeight: number;
  displayWidth: number;
  displayHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface UseCoordinateMappingReturn {
  updateVideoMetrics: (video: HTMLVideoElement, container: HTMLElement) => VideoMetrics;
  detectionToViewport: (detection: Detection, metrics: VideoMetrics) => { x: number; y: number };
  detectionToNormalized: (detection: Detection, metrics: VideoMetrics) => { x: number; y: number };
  viewportToNormalized: (x: number, y: number, metrics: VideoMetrics) => { x: number; y: number };
  getMetrics: () => VideoMetrics | null;
}

export function useCoordinateMapping(): UseCoordinateMappingReturn {
  const metricsRef = useRef<VideoMetrics | null>(null);

  /**
   * Calculate the actual display metrics considering object-fit: contain
   */
  const updateVideoMetrics = useCallback((video: HTMLVideoElement, container: HTMLElement): VideoMetrics => {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (!videoWidth || !videoHeight) {
      const defaultMetrics: VideoMetrics = {
        videoWidth: 1920,
        videoHeight: 1080,
        displayWidth: containerWidth,
        displayHeight: containerHeight,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      };
      metricsRef.current = defaultMetrics;
      return defaultMetrics;
    }

    const videoAspect = videoWidth / videoHeight;
    const containerAspect = containerWidth / containerHeight;

    let displayWidth: number;
    let displayHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (videoAspect > containerAspect) {
      // Video is wider - letterbox top/bottom
      displayWidth = containerWidth;
      displayHeight = containerWidth / videoAspect;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Video is taller - pillarbox left/right
      displayHeight = containerHeight;
      displayWidth = containerHeight * videoAspect;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }

    const scale = displayWidth / videoWidth;

    const metrics: VideoMetrics = {
      videoWidth,
      videoHeight,
      displayWidth,
      displayHeight,
      offsetX,
      offsetY,
      scale,
    };

    metricsRef.current = metrics;
    return metrics;
  }, []);

  /**
   * Convert Roboflow detection (percentage-based) to viewport pixel coordinates
   */
  const detectionToViewport = useCallback((detection: Detection, metrics: VideoMetrics): { x: number; y: number } => {
    // Detection x/y are percentage-based (0-100)
    const centerX = detection.x + detection.width / 2;
    const centerY = detection.y + detection.height / 2;

    // Convert to pixels within the displayed video area
    const pixelX = (centerX / 100) * metrics.displayWidth + metrics.offsetX;
    const pixelY = (centerY / 100) * metrics.displayHeight + metrics.offsetY;

    return { x: pixelX, y: pixelY };
  }, []);

  /**
   * Convert Roboflow detection to normalized coordinates (0-1) for the Python bridge
   */
  const detectionToNormalized = useCallback((detection: Detection, metrics: VideoMetrics): { x: number; y: number } => {
    const viewport = detectionToViewport(detection, metrics);
    
    // Normalize to 0-1 based on display dimensions + offsets
    const totalWidth = metrics.displayWidth + metrics.offsetX * 2;
    const totalHeight = metrics.displayHeight + metrics.offsetY * 2;
    
    return {
      x: viewport.x / totalWidth,
      y: viewport.y / totalHeight,
    };
  }, [detectionToViewport]);

  /**
   * Convert viewport pixel coordinates to normalized (0-1)
   */
  const viewportToNormalized = useCallback((x: number, y: number, metrics: VideoMetrics): { x: number; y: number } => {
    const totalWidth = metrics.displayWidth + metrics.offsetX * 2;
    const totalHeight = metrics.displayHeight + metrics.offsetY * 2;
    
    return {
      x: x / totalWidth,
      y: y / totalHeight,
    };
  }, []);

  const getMetrics = useCallback((): VideoMetrics | null => {
    return metricsRef.current;
  }, []);

  return {
    updateVideoMetrics,
    detectionToViewport,
    detectionToNormalized,
    viewportToNormalized,
    getMetrics,
  };
}
