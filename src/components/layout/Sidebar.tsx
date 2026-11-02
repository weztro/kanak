"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  UtensilsCrossed,
  ListTodo,
  Coins,
  Receipt,
  Scale,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Purchases", href: "/purchases", icon: ShoppingCart },
  { label: "Daily Cooking", href: "/consumption", icon: UtensilsCrossed },
  { label: "Shopping List", href: "/shopping", icon: ListTodo },
  { label: "Contributions", href: "/contributions", icon: Coins },
  { label: "Shared Expenses", href: "/expenses", icon: Receipt },
  { label: "Settlements", href: "/settlements", icon: Scale },
  { label: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { label: "Members", href: "/members", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-screen w-60 flex-col border-r border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 sticky top-0 shrink-0">
      <div className="flex h-14 items-center px-4 border-b border-neutral-200/80 dark:border-neutral-800">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            K
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              Kanak
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">
              Shared Bachelor Pad
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Management
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-neutral-100 text-neutral-900 font-semibold shadow-2xs dark:bg-neutral-800 dark:text-neutral-50"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-100"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-400"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-200/80 dark:border-neutral-800">
        <div className="rounded-lg bg-neutral-50 p-2.5 text-[11px] text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            Kanak PWA v1.0
          </p>
          <p className="text-[10px] mt-0.5">3–4 Bachelor Flat Manager</p>
        </div>
      </div>
    </aside>
  );
}

