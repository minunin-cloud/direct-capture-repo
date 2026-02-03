import { useCallback, useRef, useState } from "react";

export interface ActionCommand {
  type: "move" | "keypress";
  x?: number;
  y?: number;
  key?: string;
  timestamp: number;
}

export interface ActionServiceConfig {
  bridgeUrl: string;
  enabled: boolean;
  logActions: boolean;
}

interface UseActionServiceReturn {
  isConnected: boolean;
  lastError: string | null;
  actionLog: ActionCommand[];
  config: ActionServiceConfig;
  
  // Actions
  sendMove: (x: number, y: number) => Promise<boolean>;
  sendKeypress: (key: string) => Promise<boolean>;
  testConnection: () => Promise<boolean>;
  updateConfig: (config: Partial<ActionServiceConfig>) => void;
  clearLog: () => void;
}

const DEFAULT_CONFIG: ActionServiceConfig = {
  bridgeUrl: "http://localhost:5001/action",
  enabled: false,
  logActions: true,
};

export function useActionService(): UseActionServiceReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<ActionCommand[]>([]);
  const [config, setConfig] = useState<ActionServiceConfig>(DEFAULT_CONFIG);
  
  const logActionRef = useRef<ActionCommand[]>([]);

  const logAction = useCallback((command: ActionCommand) => {
    if (config.logActions) {
      logActionRef.current = [...logActionRef.current.slice(-99), command];
      setActionLog(logActionRef.current);
    }
  }, [config.logActions]);

  const sendAction = useCallback(async (
    payload: { type: "move"; x: number; y: number } | { type: "keypress"; key: string }
  ): Promise<boolean> => {
    if (!config.enabled) {
      console.log("[ActionService] Disabled, skipping:", payload);
      return false;
    }

    const command: ActionCommand = {
      ...payload,
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(config.bridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setIsConnected(true);
      setLastError(null);
      logAction(command);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setLastError(message);
      setIsConnected(false);
      console.error("[ActionService] Error:", message);
      return false;
    }
  }, [config.bridgeUrl, config.enabled, logAction]);

  const sendMove = useCallback(async (x: number, y: number): Promise<boolean> => {
    // Normalize coordinates to 0-1 range
    const normalizedX = Math.max(0, Math.min(1, x));
    const normalizedY = Math.max(0, Math.min(1, y));
    return sendAction({ type: "move", x: normalizedX, y: normalizedY });
  }, [sendAction]);

  const sendKeypress = useCallback(async (key: string): Promise<boolean> => {
    return sendAction({ type: "keypress", key });
  }, [sendAction]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(config.bridgeUrl.replace("/action", "/health"), {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      
      const connected = response.ok;
      setIsConnected(connected);
      setLastError(connected ? null : "Bridge nicht erreichbar");
      return connected;
    } catch (err) {
      setIsConnected(false);
      setLastError("Bridge nicht erreichbar");
      return false;
    }
  }, [config.bridgeUrl]);

  const updateConfig = useCallback((newConfig: Partial<ActionServiceConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const clearLog = useCallback(() => {
    logActionRef.current = [];
    setActionLog([]);
  }, []);

  return {
    isConnected,
    lastError,
    actionLog,
    config,
    sendMove,
    sendKeypress,
    testConnection,
    updateConfig,
    clearLog,
  };
}
