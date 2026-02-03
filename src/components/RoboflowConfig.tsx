import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Save,
  RotateCcw
} from "lucide-react";

// Vorkonfiguriertes Roboflow Model
const DEFAULT_MODEL = {
  workspace: "the-first-day-hndzp",
  project: "wow-bot-4gbbx",
  version: "1",
};

const buildModelUrl = (workspace: string, project: string, version: string) => 
  `https://detect.roboflow.com/${workspace}/${project}/${version}`;

interface RoboflowConfigProps {
  modelUrl: string;
  onModelUrlChange: (url: string) => void;
  isConfigured: boolean;
  error: string | null;
  isLoading?: boolean;
  lastInferenceTime?: number;
  className?: string;
}

export function RoboflowConfig({
  modelUrl,
  onModelUrlChange,
  isConfigured,
  error,
  isLoading = false,
  lastInferenceTime = 0,
  className,
}: RoboflowConfigProps) {
  const [workspace, setWorkspace] = useState(DEFAULT_MODEL.workspace);
  const [project, setProject] = useState(DEFAULT_MODEL.project);
  const [version, setVersion] = useState(DEFAULT_MODEL.version);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isConfigured);

  // Parse existing URL on mount
  useEffect(() => {
    if (modelUrl) {
      const match = modelUrl.match(/detect\.roboflow\.com\/([^/]+)\/([^/]+)\/(\d+)/);
      if (match) {
        setWorkspace(match[1]);
        setProject(match[2]);
        setVersion(match[3]);
      }
    }
  }, []);

  // Auto-configure with defaults on first load
  useEffect(() => {
    if (!modelUrl && DEFAULT_MODEL.workspace) {
      const defaultUrl = buildModelUrl(DEFAULT_MODEL.workspace, DEFAULT_MODEL.project, DEFAULT_MODEL.version);
      onModelUrlChange(defaultUrl);
    }
  }, [modelUrl, onModelUrlChange]);

  const handleSave = () => {
    if (!workspace || !project || !version) return;
    setIsSaving(true);
    const url = buildModelUrl(workspace, project, version);
    onModelUrlChange(url);
    setTimeout(() => {
      setIsSaving(false);
      setIsExpanded(false);
    }, 500);
  };

  const handleReset = () => {
    setWorkspace(DEFAULT_MODEL.workspace);
    setProject(DEFAULT_MODEL.project);
    setVersion(DEFAULT_MODEL.version);
  };

  const getStatusBadge = () => {
    if (error) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-destructive/20 border border-destructive/50 rounded text-xs text-destructive">
          <AlertCircle className="w-3 h-3" />
          Fehler
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-warning/20 border border-warning/50 rounded text-xs text-warning">
          <Loader2 className="w-3 h-3 animate-spin" />
          Inferenz läuft...
        </div>
      );
    }
    if (isConfigured) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-success/20 border border-success/50 rounded text-xs text-success">
          <CheckCircle2 className="w-3 h-3" />
          Bereit
          {lastInferenceTime > 0 && (
            <span className="ml-1 text-muted-foreground">({lastInferenceTime.toFixed(0)}ms)</span>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-muted border border-border rounded text-xs text-muted-foreground">
        <Cloud className="w-3 h-3" />
        Nicht konfiguriert
      </div>
    );
  };

  return (
    <div className={cn("space-y-3 p-4 bg-secondary/30 rounded-lg border border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Roboflow Vision</h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? "Einklappen" : "Bearbeiten"}
          </Button>
        </div>
      </div>

      {/* Current Model Display */}
      {!isExpanded && isConfigured && (
        <div className="text-xs font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded truncate">
          {modelUrl}
        </div>
      )}

      {/* Expanded Config Form */}
      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="workspace" className="text-xs text-muted-foreground">
                Workspace
              </Label>
              <Input
                id="workspace"
                placeholder="workspace-id"
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="project" className="text-xs text-muted-foreground">
                Project
              </Label>
              <Input
                id="project"
                placeholder="project-name"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="version" className="text-xs text-muted-foreground">
                Version
              </Label>
              <Input
                id="version"
                placeholder="1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="font-mono text-xs h-8 w-16"
              />
            </div>
          </div>

          {/* Preview URL */}
          <div className="text-xs font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded truncate">
            → {buildModelUrl(workspace || "...", project || "...", version || "...")}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1 text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Standard
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving || !workspace || !project || !version}
              className="gap-1"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Speichern
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-xs">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-destructive font-medium">API Fehler</span>
            <p className="text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* Footer Links */}
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <a 
          href="https://app.roboflow.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Roboflow Dashboard
        </a>
        <span className="text-xs text-muted-foreground">
          API Key wird sicher in Cloud Secrets gespeichert
        </span>
      </div>
    </div>
  );
}
