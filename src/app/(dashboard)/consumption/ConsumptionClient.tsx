"use client";

import * as React from "react";
import Link from "next/link";
import { ConsumptionLog } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UtensilsCrossed,
  Plus,
  Calendar,
  User,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Flame,
} from "lucide-react";

interface Props {
  logs: ConsumptionLog[];
}

export function ConsumptionClient({ logs }: Props) {
  const [mealFilter, setMealFilter] = React.useState("ALL");

  const filteredLogs = logs.filter((log) => {
    return mealFilter === "ALL" || log.meal_type === mealFilter;
  });

  const getMealIcon = (meal: string) => {
    switch (meal) {
      case "Breakfast":
        return <Coffee className="h-4 w-4 text-amber-500" />;
      case "Lunch":
        return <Sun className="h-4 w-4 text-orange-500" />;
      case "Dinner":
        return <Moon className="h-4 w-4 text-indigo-500" />;
      case "Snacks":
        return <Cookie className="h-4 w-4 text-yellow-500" />;
      default:
        return <Flame className="h-4 w-4 text-neutral-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Daily Cooking & Consumption
          </h1>
          <p className="text-xs text-neutral-500">
            Log ingredients used during daily cooking. Inventory stock is decremented automatically.
          </p>
        </div>
        <Link href="/consumption/new">
          <Button size="sm" className="text-xs h-8">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Cooking Meal
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-2">
        <Select value={mealFilter} onValueChange={setMealFilter}>
          <SelectTrigger className="w-40 h-8 text-xs border-neutral-200 dark:border-neutral-800">
            <SelectValue placeholder="All Meal Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Meal Types</SelectItem>
            <SelectItem value="Breakfast">Breakfast</SelectItem>
            <SelectItem value="Lunch">Lunch</SelectItem>
            <SelectItem value="Dinner">Dinner</SelectItem>
            <SelectItem value="Snacks">Snacks</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Consumption Logs */}
      {filteredLogs.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-neutral-200 dark:border-neutral-800">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-neutral-400" />
          <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            No cooking logs yet
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Log breakfast, lunch, or dinner cooking sessions to keep pantry quantities accurate.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const itemCount = log.items?.length || 0;

            return (
              <Card
                key={log.id}
                className="border-neutral-200/80 shadow-xs hover:border-neutral-300 dark:border-neutral-800 transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        {getMealIcon(log.meal_type)}
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {log.meal_type}
                        </span>
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {itemCount} ingredients used
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" /> {formatDate(log.consumption_date)}
                        </span>
                        <span className="flex items-center">
                          <User className="mr-1 h-3 w-3" /> Cooked / Logged by{" "}
                          <strong className="ml-1 text-neutral-700 dark:text-neutral-300">
                            {log.recorder?.profile?.full_name || "Flatmate"}
                          </strong>
                        </span>
                        {log.notes && (
                          <span className="italic text-neutral-500">&quot;{log.notes}&quot;</span>
                        )}
                      </div>

                      {/* Ingredients Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {log.items?.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          >
                            {item.item?.name}: {item.quantity} {item.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

