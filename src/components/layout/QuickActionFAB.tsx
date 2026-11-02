"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  ShoppingCart,
  UtensilsCrossed,
  Coins,
  Receipt,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function QuickActionFAB() {
  const [open, setOpen] = React.useState(false);

  const actions = [
    {
      label: "Add Purchase",
      desc: "Grocery receipt, vegetables, supplies",
      href: "/purchases/new",
      icon: ShoppingCart,
      color: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    },
    {
      label: "Record Consumption",
      desc: "Cooking ingredients, breakfast, lunch, dinner",
      href: "/consumption/new",
      icon: UtensilsCrossed,
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    },
    {
      label: "Add Monthly Contribution",
      desc: "Deposit dues into common fund",
      href: "/contributions",
      icon: Coins,
      color: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    },
    {
      label: "Add Shared Expense",
      desc: "Electricity, cylinder, water, wifi, maid",
      href: "/expenses/new",
      icon: Receipt,
      color: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8 dark:bg-neutral-100 dark:text-neutral-900"
          aria-label="Quick Actions"
        >
          <Plus className="h-6 w-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Quick Action</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2.5 pt-2">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.label}
                href={act.href}
                onClick={() => setOpen(false)}
                className="flex items-center space-x-3 rounded-xl border border-neutral-200/80 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${act.color} shrink-0`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {act.label}
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {act.desc}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

