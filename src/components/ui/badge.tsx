import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default:
      "border-transparent bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900",
    secondary:
      "border-transparent bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
    destructive:
      "border-transparent bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    success:
      "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
    warning:
      "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
    outline: "text-neutral-800 border-neutral-200 dark:border-neutral-800 dark:text-neutral-200",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };

