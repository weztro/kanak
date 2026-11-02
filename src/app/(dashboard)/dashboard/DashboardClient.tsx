"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardMetrics, getDashboardData } from "@/server/actions/dashboard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExpenseTrendChart } from "@/components/charts/ExpenseTrendChart";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  Receipt,
  Wallet,
  Coins,
  Package,
  AlertTriangle,
  Scale,
  ShoppingCart,
  UtensilsCrossed,
  ListTodo,
  ArrowRight,
  TrendingUp,
  Calendar,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  initialData: DashboardMetrics;
}

export function DashboardClient({ initialData }: Props) {
  const [data, setData] = React.useState<DashboardMetrics>(initialData);
  const [selectedMonth, setSelectedMonth] = React.useState(
    new Date().toISOString().slice(0, 7)
  );
  const [isLoadingMonth, setIsLoadingMonth] = React.useState(false);

  const handleMonthChange = async (monthStr: string) => {
    setSelectedMonth(monthStr);
    setIsLoadingMonth(true);
    try {
      const refreshed = await getDashboardData(`${monthStr}-01`);
      if (refreshed) {
        setData(refreshed);
      }
    } catch {
      toast.error("Failed to load metrics for selected month");
    } finally {
      setIsLoadingMonth(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Month Selector Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Accommodation Dashboard
          </h1>
          <p className="text-xs text-neutral-500">
            Shared groceries, transparent expenses, and inventory health at a glance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-neutral-400 font-medium">Filter Month:</span>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={isLoadingMonth}
            className="w-36 h-8 text-xs bg-white dark:bg-neutral-900"
          />
          {isLoadingMonth && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
        </div>
      </div>

      {/* 7 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Members */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-medium uppercase">Members</span>
            <Users className="h-3.5 w-3.5 text-neutral-400" />
          </div>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            {data.totalMembers}
          </span>
          <span className="text-[9px] text-neutral-400">Active flatmates</span>
        </Card>

        {/* 2. Monthly Expenses */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-medium uppercase">Expenses</span>
            <Receipt className="h-3.5 w-3.5 text-neutral-400" />
          </div>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-2 truncate">
            {formatCurrency(data.monthlyExpenses, data.currency)}
          </span>
          <span className="text-[9px] text-neutral-400">Budget: {formatCurrency(data.monthlyBudget)}</span>
        </Card>

        {/* 3. Common Fund Balance */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-medium uppercase">Fund Pool</span>
            <Wallet className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-2 truncate">
            {formatCurrency(data.commonFundBalance, data.currency)}
          </span>
          <span className="text-[9px] text-neutral-400">Common cash balance</span>
        </Card>

        {/* 4. Monthly Contributions */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-medium uppercase">Dues In</span>
            <Coins className="h-3.5 w-3.5 text-neutral-400" />
          </div>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-2 truncate">
            {formatCurrency(data.monthlyContributions, data.currency)}
          </span>
          <span className="text-[9px] text-neutral-400">Collected this month</span>
        </Card>

        {/* 5. Total Inventory Items */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-medium uppercase">Items</span>
            <Package className="h-3.5 w-3.5 text-neutral-400" />
          </div>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            {data.totalInventoryItems}
          </span>
          <span className="text-[9px] text-neutral-400">Pantry catalog</span>
        </Card>

        {/* 6. Low Stock Items */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-medium uppercase">Low Stock</span>
            <AlertTriangle className={`h-3.5 w-3.5 ${data.lowStockCount > 0 ? "text-amber-500" : "text-neutral-400"}`} />
          </div>
          <span
            className={`text-lg font-bold mt-2 ${
              data.lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-100"
            }`}
          >
            {data.lowStockCount}
          </span>
          <span className="text-[9px] text-neutral-400">Needs restock</span>
        </Card>

        {/* 7. Pending Settlements */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-3 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-medium uppercase">Debts</span>
            <Scale className="h-3.5 w-3.5 text-neutral-400" />
          </div>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            {data.pendingSettlementCount}
          </span>
          <span className="text-[9px] text-neutral-400">Suggested transfers</span>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Expense Trend */}
        <Card className="lg:col-span-2 border-neutral-200/80 shadow-xs dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>6-Month Expense Trend</span>
              <TrendingUp className="h-4 w-4 text-neutral-400" />
            </CardTitle>
            <CardDescription className="text-xs">
              Combined grocery purchases and shared apartment expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ExpenseTrendChart data={data.expenseTrend} currency={data.currency} />
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Spending by Category</CardTitle>
            <CardDescription className="text-xs">
              Distribution for {selectedMonth}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <CategoryPieChart data={data.categoryBreakdown} currency={data.currency} />
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts & Shopping List Preview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Items Alert Card */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
          <CardHeader className="pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Low Stock Alerts ({data.lowStockItems.length})</span>
              </CardTitle>
              <Link href="/inventory" className="text-xs text-neutral-500 hover:text-neutral-900">
                View Pantry <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.lowStockItems.length === 0 ? (
              <p className="p-6 text-center text-xs text-neutral-400">
                All pantry items are above minimum stock thresholds.
              </p>
            ) : (
              data.lowStockItems.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-neutral-400">{item.category_name}</span>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.current_stock <= 0 ? "destructive" : "warning"} className="text-[10px] py-0">
                      {item.current_stock <= 0 ? "Out of Stock" : "Low Stock"}
                    </Badge>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      {item.current_stock} / min {item.minimum_stock} {item.base_unit}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Shopping List Items */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
          <CardHeader className="pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center space-x-1.5">
                <ListTodo className="h-4 w-4 text-neutral-500" />
                <span>Pending Shopping Items ({data.pendingShoppingItems.length})</span>
              </CardTitle>
              <Link href="/shopping" className="text-xs text-neutral-500 hover:text-neutral-900">
                Open List <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.pendingShoppingItems.length === 0 ? (
              <p className="p-6 text-center text-xs text-neutral-400">
                No pending items in your shopping list.
              </p>
            ) : (
              data.pendingShoppingItems.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Quantity: {item.quantity} {item.unit}
                    </span>
                  </div>
                  <Badge variant={item.priority === "URGENT" ? "destructive" : "secondary"} className="text-[10px] py-0">
                    {item.priority}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Purchases & Cooking Logs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Purchases */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
          <CardHeader className="pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center space-x-1.5">
                <ShoppingCart className="h-4 w-4 text-neutral-500" />
                <span>Recent Grocery Purchases</span>
              </CardTitle>
              <Link href="/purchases" className="text-xs text-neutral-500 hover:text-neutral-900">
                All Purchases <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.recentPurchases.length === 0 ? (
              <p className="p-6 text-center text-xs text-neutral-400">
                No recent purchases recorded.
              </p>
            ) : (
              data.recentPurchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      {p.shop_name}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {formatDate(p.purchase_date)} • {p.buyer_name} ({p.payment_source === "COMMON_FUND" ? "Fund" : "Personal"})
                    </span>
                  </div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(p.total_amount, data.currency)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Cooking Logs */}
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
          <CardHeader className="pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center space-x-1.5">
                <UtensilsCrossed className="h-4 w-4 text-neutral-500" />
                <span>Recent Cooking Consumption</span>
              </CardTitle>
              <Link href="/consumption" className="text-xs text-neutral-500 hover:text-neutral-900">
                All Logs <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.recentConsumption.length === 0 ? (
              <p className="p-6 text-center text-xs text-neutral-400">
                No cooking sessions logged yet.
              </p>
            ) : (
              data.recentConsumption.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {c.meal_type}
                      </span>
                      <span className="text-[10px] text-neutral-400">by {c.recorder_name}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 truncate block max-w-xs mt-0.5">
                      {c.items_summary}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {formatDate(c.consumption_date)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Flatmate Contribution Dues Summary */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Flatmate Contribution Summary</CardTitle>
            <Link href="/contributions" className="text-xs text-neutral-500 hover:text-neutral-900">
              Manage Dues <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {data.memberContributionsSummary.map((mem, idx) => {
              const isPaid = mem.paid >= mem.expected;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-neutral-100 p-3 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/30 text-xs"
                >
                  <span className="text-[10px] text-neutral-400 block">Flatmate</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                    {mem.name}
                  </span>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(mem.paid, data.currency)}
                    </span>
                    <Badge variant={isPaid ? "success" : "destructive"} className="text-[9px] py-0">
                      {isPaid ? "Paid" : "Pending"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

