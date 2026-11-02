"use client";

import * as React from "react";
import Link from "next/link";
import { Expense } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
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
  Receipt,
  Plus,
  Calendar,
  User,
  Zap,
  Droplet,
  Flame,
  Wifi,
  Wrench,
  Sparkles,
  Building,
} from "lucide-react";

interface Props {
  expenses: Expense[];
}

export function ExpensesClient({ expenses }: Props) {
  const [catFilter, setCatFilter] = React.useState("ALL");

  const filteredExpenses = expenses.filter((e) => {
    return catFilter === "ALL" || e.category === catFilter;
  });

  const totalAmount = filteredExpenses
    .filter((e) => e.status === "POSTED")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Electricity":
        return <Zap className="h-4 w-4 text-amber-500" />;
      case "Water":
        return <Droplet className="h-4 w-4 text-blue-500" />;
      case "Gas":
        return <Flame className="h-4 w-4 text-orange-500" />;
      case "Wifi":
        return <Wifi className="h-4 w-4 text-indigo-500" />;
      case "Repairs":
        return <Wrench className="h-4 w-4 text-red-500" />;
      case "Cleaning":
      case "Maid":
        return <Sparkles className="h-4 w-4 text-teal-500" />;
      case "Rent":
        return <Building className="h-4 w-4 text-purple-500" />;
      default:
        return <Receipt className="h-4 w-4 text-neutral-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Shared Accommodation Expenses
          </h1>
          <p className="text-xs text-neutral-500">
            Electricity, gas cylinders, drinking water, WiFi, and flat maintenance.
          </p>
        </div>
        <Link href="/expenses/new">
          <Button size="sm" className="text-xs h-8">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Expense
          </Button>
        </Link>
      </div>

      {/* KPI & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-44 h-8 text-xs border-neutral-200 dark:border-neutral-800">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="Electricity">Electricity</SelectItem>
              <SelectItem value="Water">Drinking Water</SelectItem>
              <SelectItem value="Gas">Gas Cylinder</SelectItem>
              <SelectItem value="Wifi">WiFi Internet</SelectItem>
              <SelectItem value="Maid">Maid / Cook</SelectItem>
              <SelectItem value="Repairs">Repairs & Maintenance</SelectItem>
              <SelectItem value="Cleaning">Cleaning</SelectItem>
              <SelectItem value="Rent">Rent</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-neutral-400">Total Filtered Expenses: </span>
          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-neutral-200 dark:border-neutral-800">
          <Receipt className="mx-auto h-10 w-10 text-neutral-400" />
          <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            No expenses recorded yet
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Add non-grocery expenses like electricity bills, gas cylinders, or water cans.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((exp) => (
            <Card
              key={exp.id}
              className="border-neutral-200/80 shadow-xs hover:border-neutral-300 dark:border-neutral-800 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(exp.category)}
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {exp.description}
                      </span>
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {exp.category}
                      </Badge>
                      <Badge
                        variant={exp.payment_source === "COMMON_FUND" ? "default" : "outline"}
                        className="text-[10px] py-0"
                      >
                        {exp.payment_source === "COMMON_FUND"
                          ? "Common Fund"
                          : "Personal Advance"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" /> {formatDate(exp.expense_date)}
                      </span>
                      <span className="flex items-center">
                        <User className="mr-1 h-3 w-3" /> Paid by{" "}
                        <strong className="ml-1 text-neutral-700 dark:text-neutral-300">
                          {exp.payer?.profile?.full_name || "Member"}
                        </strong>
                      </span>
                      {exp.notes && (
                        <span className="italic text-neutral-500">&quot;{exp.notes}&quot;</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 block">
                      {formatCurrency(Number(exp.amount))}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Split equally among active members
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

