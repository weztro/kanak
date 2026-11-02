"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ListTodo,
  Receipt,
  MoreHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  UtensilsCrossed,
  Coins,
  Scale,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const [openMore, setOpenMore] = React.useState(false);

  const mainNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Package },
    { label: "Shopping", href: "/shopping", icon: ListTodo },
    { label: "Expenses", href: "/expenses", icon: Receipt },
  ];

  const moreNav = [
    { label: "Purchases", href: "/purchases", icon: ShoppingCart },
    { label: "Daily Cooking", href: "/consumption", icon: UtensilsCrossed },
    { label: "Monthly Contributions", href: "/contributions", icon: Coins },
    { label: "Settlements & Dues", href: "/settlements", icon: Scale },
    { label: "Reports & Analytics", href: "/reports", icon: BarChart3 },
    { label: "Members", href: "/members", icon: Users },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-neutral-200/90 bg-white/95 px-2 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95 pb-safe">
      {mainNav.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 py-1 px-3 text-[10px] font-medium transition-colors",
              isActive
                ? "text-neutral-900 font-semibold dark:text-neutral-50"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isActive ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400"
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <Dialog open={openMore} onOpenChange={setOpenMore}>
        <DialogTrigger asChild>
          <button className="flex flex-col items-center justify-center space-y-1 py-1 px-3 text-[10px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400">
            <MoreHorizontal className="h-5 w-5 text-neutral-400" />
            <span>More</span>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">More Management</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {moreNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenMore(false)}
                  className="flex items-center space-x-2 rounded-lg border border-neutral-100 p-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <Icon className="h-4 w-4 text-neutral-500" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}

