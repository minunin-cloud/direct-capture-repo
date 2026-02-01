import { cn } from "@/lib/utils";

interface Keybind {
  key: string;
  action: string;
  category: "attack" | "spell" | "utility" | "movement";
}

const keybinds: Keybind[] = [
  { key: "1", action: "Attack", category: "attack" },
  { key: "2", action: "Spell 2", category: "spell" },
  { key: "3", action: "Spell 3", category: "spell" },
  { key: "4", action: "Spell 4", category: "spell" },
  { key: "5", action: "Execute", category: "attack" },
  { key: "6", action: "Defensive", category: "utility" },
  { key: "7", action: "Mount", category: "movement" },
  { key: "8", action: "AoE 1", category: "attack" },
  { key: "9", action: "AoE 2", category: "attack" },
  { key: "0", action: "Heal", category: "utility" },
  { key: "F", action: "Interact", category: "utility" },
  { key: "Tab", action: "Target", category: "utility" },
  { key: "X", action: "Sit", category: "movement" },
  { key: "G", action: "Retarget", category: "utility" },
  { key: "-", action: "Trinket", category: "utility" },
  { key: "Shift+F", action: "Loot All", category: "utility" },
];

const categoryColors = {
  attack: "border-destructive/50 text-destructive",
  spell: "border-primary/50 text-primary",
  utility: "border-warning/50 text-warning",
  movement: "border-success/50 text-success",
};

interface KeybindGridProps {
  className?: string;
}

export function KeybindGrid({ className }: KeybindGridProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Attack</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">Spell</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-muted-foreground">Utility</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-muted-foreground">Movement</span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {keybinds.map((bind) => (
          <div
            key={bind.key}
            className={cn(
              "group relative flex flex-col items-center p-2 rounded-lg border bg-secondary/30 transition-all duration-200 hover:bg-secondary/50",
              categoryColors[bind.category]
            )}
          >
            <span className="text-lg font-mono font-bold">{bind.key}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              {bind.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
