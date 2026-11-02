"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WifiOff, RotateCcw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-200/80 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          You are currently offline
        </h1>
        <p className="text-xs text-neutral-500">
          Kanak requires a live connection to synchronize grocery balances and inventory movements with your flatmates safely.
        </p>
        <div className="pt-2 flex flex-col space-y-2">
          <Button
            onClick={() => window.location.reload()}
            className="w-full text-xs font-medium"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry Connection
          </Button>
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full text-xs font-medium">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

