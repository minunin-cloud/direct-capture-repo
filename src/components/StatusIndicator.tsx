import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "idle" | "running" | "error" | "warning";
  label: string;
  className?: string;
}

const statusConfig = {
  idle: {
    color: "bg-muted-foreground",
    glow: "",
    text: "text-muted-foreground",
  },
  running: {
    color: "bg-success",
    glow: "glow-success",
    text: "text-success",
  },
  error: {
    color: "bg-destructive",
    glow: "glow-danger",
    text: "text-destructive",
  },
  warning: {
    color: "bg-warning",
    glow: "glow-warning",
    text: "text-warning",
  },
};

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            config.color,
            status === "running" && "animate-pulse-slow"
          )}
        />
        {status === "running" && (
          <div
            className={cn(
              "absolute inset-0 w-3 h-3 rounded-full",
              config.color,
              "animate-ping opacity-75"
            )}
          />
        )}
      </div>
      <span className={cn("text-sm font-medium uppercase tracking-wide", config.text)}>
        {label}
      </span>
    </div>
  );
}
