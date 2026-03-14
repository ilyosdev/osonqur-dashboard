import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  labelPosition?: "right" | "below";
  variant?: "default" | "destructive" | "warning" | "success";
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = true,
  size = "md",
  className,
  labelPosition = "right",
  variant,
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  const getColorClass = () => {
    if (variant === "destructive") return "bg-destructive";
    if (variant === "warning") return "bg-warning";
    if (variant === "success") return "bg-success";
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-warning";
    return "bg-primary";
  };

  const getTrackColorClass = () => {
    if (variant === "destructive") return "bg-destructive/10";
    if (variant === "warning") return "bg-warning/10";
    if (variant === "success") return "bg-success/10";
    if (percentage >= 90) return "bg-destructive/10";
    if (percentage >= 70) return "bg-warning/10";
    return "bg-primary/10";
  };

  const getLabelColorClass = () => {
    if (variant === "destructive") return "text-destructive";
    if (variant === "warning") return "text-warning";
    if (variant === "success") return "text-success";
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-primary";
  };

  const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("flex items-center gap-3", labelPosition === "below" && "flex-col items-stretch gap-1")}>
        <div
          className={cn(
            "flex-1 rounded-full overflow-hidden",
            getTrackColorClass(),
            sizeStyles[size]
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              getColorClass()
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums shrink-0",
              getLabelColorClass()
            )}
          >
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
}
