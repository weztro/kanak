"use client";

import * as React from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "segmented" | "button";
}

export function ThemeToggle({ className, variant = "segmented" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === "button") {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={cn(
          "inline-flex items-center justify-center rounded-lg p-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors",
          className
        )}
        title={`Current theme: ${theme}. Click to toggle.`}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Moon className="h-4 w-4 text-indigo-400" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
          theme === "light"
            ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:text-neutral-50"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        )}
        title="Light Mode"
      >
        <Sun className="h-3.5 w-3.5 text-amber-500" />
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
          theme === "dark"
            ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:text-neutral-50"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        )}
        title="Dark Mode"
      >
        <Moon className="h-3.5 w-3.5 text-indigo-400" />
        <span>Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("system")}
        className={cn(
          "flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
          theme === "system"
            ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:text-neutral-50"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        )}
        title="Follow System Theme"
      >
        <Laptop className="h-3.5 w-3.5 text-neutral-400" />
        <span>Auto</span>
      </button>
    </div>
  );
}
