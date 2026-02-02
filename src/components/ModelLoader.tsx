import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2, AlertCircle, Loader2, Brain } from "lucide-react";
import { useState, useRef } from "react";

interface ModelLoaderProps {
  isModelLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  onLoadModel: (url: string) => void;
  className?: string;
}

export function ModelLoader({
  isModelLoaded,
  isLoading,
  error,
  onLoadModel,
  className,
}: ModelLoaderProps) {
  const [modelUrl, setModelUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = () => {
    if (modelUrl.trim()) {
      onLoadModel(modelUrl.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Look for model.json
    const modelJsonFile = Array.from(files).find(f => f.name === "model.json");
    if (!modelJsonFile) {
      alert("Bitte wähle einen Ordner mit einer model.json Datei");
      return;
    }

    // Create object URLs for all files
    const fileMap = new Map<string, string>();
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      fileMap.set(file.name, url);
    });

    // For local files, we need to use a custom IOHandler
    // For simplicity, suggest using a URL instead
    alert(
      "Lokale Dateien werden noch nicht unterstützt.\n\n" +
      "Bitte hoste dein Modell auf einem Server (z.B. GitHub Pages, Supabase Storage) " +
      "und gib die URL zur model.json ein."
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold">ML Model</h4>
        {isModelLoaded && (
          <div className="flex items-center gap-1 text-xs text-success ml-auto">
            <CheckCircle2 className="w-3 h-3" />
            <span>Geladen</span>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Laden...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isModelLoaded && !isLoading && (
        <>
          <div className="flex gap-2">
            <Input
              placeholder="URL zu model.json..."
              value={modelUrl}
              onChange={(e) => setModelUrl(e.target.value)}
              className="flex-1 h-8 text-xs"
            />
            <Button
              size="sm"
              onClick={handleUrlSubmit}
              disabled={!modelUrl.trim()}
              className="h-8"
            >
              Laden
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Exportiere dein Roboflow-Modell als "TensorFlow.js" und hoste es auf einem Server.
            Gib dann die URL zur model.json ein.
          </p>
        </>
      )}

      {isModelLoaded && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={() => {
            setModelUrl("");
            // Reset would require a callback to parent
          }}
        >
          Anderes Modell laden
        </Button>
      )}
    </div>
  );
}
