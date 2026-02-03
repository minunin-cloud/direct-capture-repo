import { useState } from "react";
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
  Save
} from "lucide-react";

interface RoboflowConfigProps {
  modelUrl: string;
  onModelUrlChange: (url: string) => void;
  isConfigured: boolean;
  error: string | null;
  className?: string;
}

export function RoboflowConfig({
  modelUrl,
  onModelUrlChange,
  isConfigured,
  error,
  className,
}: RoboflowConfigProps) {
  const [inputUrl, setInputUrl] = useState(modelUrl);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    onModelUrlChange(inputUrl);
    setTimeout(() => setIsSaving(false), 500);
  };

  return (
    <div className={cn("space-y-4 p-4 bg-secondary/30 rounded-lg border border-border", className)}>
      <div className="flex items-center gap-2">
        <Cloud className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Roboflow Konfiguration</h3>
        {isConfigured && !error && (
          <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="model-url" className="text-sm text-muted-foreground">
          Roboflow Model URL
        </Label>
        <div className="flex gap-2">
          <Input
            id="model-url"
            placeholder="https://detect.roboflow.com/workspace/project/version"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 font-mono text-xs"
          />
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving || !inputUrl}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Format: https://detect.roboflow.com/workspace/project/version
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-xs">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <span className="text-destructive">{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <a 
          href="https://app.roboflow.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Roboflow Dashboard öffnen
        </a>
      </div>
    </div>
  );
}
