"use client";

import * as React from "react";
import Link from "next/link";
import { Accommodation } from "@/types/database";
import { AccommodationSwitcher } from "./AccommodationSwitcher";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, User } from "lucide-react";

interface HeaderProps {
  accommodations: Accommodation[];
  activeAccommodationId: string | null;
  userName?: string;
  userEmail?: string;
}

export function Header({
  accommodations,
  activeAccommodationId,
  userName,
  userEmail,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-neutral-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 sm:px-6">
      <div className="flex items-center space-x-3">
        <Link href="/dashboard" className="flex items-center space-x-2 md:hidden">
          <div className="h-7 w-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            K
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
            Kanak
          </span>
        </Link>

        {accommodations.length > 0 && (
          <AccommodationSwitcher
            accommodations={accommodations}
            activeId={activeAccommodationId}
          />
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          title="Notifications"
          asChild
        >
          <Link href="/dashboard#notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>

        <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-neutral-200 dark:border-neutral-800">
          <div className="h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {userName ? userName.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-none">
              {userName || "Bachelor"}
            </span>
            <span className="text-[10px] text-neutral-400 leading-none mt-0.5">
              {userEmail || ""}
            </span>
          </div>
        </div>

        <form action={logoutAction}>
          <Button
            variant="ghost"
            size="icon"
            type="submit"
            className="h-8 w-8 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}

