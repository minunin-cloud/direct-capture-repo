import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: "default" | "success" | "danger" | "warning";
  className?: string;
}

const variantStyles = {
  default: "border-border",
  success: "border-success/30",
  danger: "border-destructive/30",
  warning: "border-warning/30",
};

const iconVariantStyles = {
  default: "text-primary",
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning",
};

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  variant = "default",
  className 
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-4 card-glow transition-all duration-300 hover:border-primary/50",
        variantStyles[variant],
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg bg-secondary/50", iconVariantStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
