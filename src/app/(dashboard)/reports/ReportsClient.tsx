"use client";

import * as React from "react";
import {
  Purchase,
  Expense,
  Contribution,
  ConsumptionLog,
  Settlement,
  MemberBalanceRow,
  Item,
} from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Download,
  FileSpreadsheet,
  BarChart3,
  Calendar,
  Package,
  Coins,
  UtensilsCrossed,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  purchases: Purchase[];
  expenses: Expense[];
  contributions: Contribution[];
  consumptionLogs: ConsumptionLog[];
  settlements: Settlement[];
  balances: MemberBalanceRow[];
  inventoryItems: Item[];
}

// Utility to export array of objects to CSV
function exportToCsv(filename: string, rows: object[]) {
  if (!rows || !rows.length) {
    toast.error("No data to export");
    return;
  }
  const separator = ",";
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    "\n" +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            let cell = (row as any)[k] === null || (row as any)[k] === undefined ? "" : (row as any)[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("CSV report downloaded successfully!");
}

export function ReportsClient({
  purchases,
  expenses,
  contributions,
  consumptionLogs,
  settlements,
  balances,
  inventoryItems,
}: Props) {
  const exportExpensesCsv = () => {
    const data = [
      ...purchases.map((p) => ({
        Type: "GROCERY_PURCHASE",
        Date: p.purchase_date,
        Description: p.shop_name,
        Category: "Groceries",
        Amount: p.total_amount,
        PaidBy: p.buyer?.profile?.full_name || "Member",
        PaymentSource: p.payment_source,
        PaymentMethod: p.payment_method,
        Status: p.status,
      })),
      ...expenses.map((e) => ({
        Type: "SHARED_EXPENSE",
        Date: e.expense_date,
        Description: e.description,
        Category: e.category,
        Amount: e.amount,
        PaidBy: e.payer?.profile?.full_name || "Member",
        PaymentSource: e.payment_source,
        PaymentMethod: "N/A",
        Status: e.status,
      })),
    ];
    exportToCsv("kanak_expenses_report", data);
  };

  const exportInventoryCsv = () => {
    const data = inventoryItems.map((i) => ({
      ItemName: i.name,
      Category: i.category?.name || "General",
      CurrentStock: i.inventory?.current_stock || 0,
      BaseUnit: i.base_unit,
      MinimumStock: i.minimum_stock,
      AveragePrice: i.inventory?.average_purchase_price || 0,
      LastPurchasedAt: i.inventory?.last_purchased_at || "Never",
    }));
    exportToCsv("kanak_inventory_report", data);
  };

  const exportContributionsCsv = () => {
    const data = contributions.map((c) => ({
      Member: c.member?.profile?.full_name || "Member",
      Month: c.period_month,
      Amount: c.amount,
      PaymentDate: c.payment_date,
      PaymentMethod: c.payment_method,
      ReferenceId: c.reference_id || "",
      Notes: c.notes || "",
    }));
    exportToCsv("kanak_contributions_report", data);
  };

  const exportSettlementsCsv = () => {
    const data = settlements.map((s) => ({
      From: s.from_member?.profile?.full_name || "Debtor",
      To: s.to_member?.profile?.full_name || "Creditor",
      Amount: s.amount,
      Date: s.settlement_date,
      PaymentMethod: s.payment_method,
      Status: s.status,
      Reference: s.transaction_reference || "",
    }));
    exportToCsv("kanak_settlements_report", data);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Reports & Data Export
        </h1>
        <p className="text-xs text-neutral-500">
          Export transparent financial and pantry audit records to CSV for your bachelor pad records.
        </p>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="grid w-full sm:w-[500px] grid-cols-4">
          <TabsTrigger value="expenses" className="text-xs">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="contributions" className="text-xs">
            Contributions
          </TabsTrigger>
          <TabsTrigger value="settlements" className="text-xs">
            Settlements
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="pt-3">
          <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <CardTitle className="text-sm font-semibold">
                  All Grocery Purchases & Shared Expenses
                </CardTitle>
                <CardDescription className="text-xs">
                  {purchases.length} purchases, {expenses.length} apartment expenses.
                </CardDescription>
              </div>
              <Button size="sm" onClick={exportExpensesCsv} variant="outline" className="text-xs h-8">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export to CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description / Shop</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Paid By</th>
                    <th className="p-3">Source</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {purchases.map((p) => (
                    <tr key={`p-${p.id}`} className="hover:bg-neutral-50/50">
                      <td className="p-3">{formatDate(p.purchase_date)}</td>
                      <td className="p-3 font-medium text-neutral-900 dark:text-neutral-100">
                        {p.shop_name}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-[10px] py-0">
                          Groceries
                        </Badge>
                      </td>
                      <td className="p-3">{p.buyer?.profile?.full_name || "Member"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] py-0">
                          {p.payment_source}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-bold">
                        {formatCurrency(Number(p.total_amount))}
                      </td>
                    </tr>
                  ))}
                  {expenses.map((e) => (
                    <tr key={`e-${e.id}`} className="hover:bg-neutral-50/50">
                      <td className="p-3">{formatDate(e.expense_date)}</td>
                      <td className="p-3 font-medium text-neutral-900 dark:text-neutral-100">
                        {e.description}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {e.category}
                        </Badge>
                      </td>
                      <td className="p-3">{e.payer?.profile?.full_name || "Member"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] py-0">
                          {e.payment_source}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-bold">
                        {formatCurrency(Number(e.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="pt-3">
          <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <CardTitle className="text-sm font-semibold">Pantry Inventory Report</CardTitle>
                <CardDescription className="text-xs">
                  {inventoryItems.length} items currently managed in catalog.
                </CardDescription>
              </div>
              <Button size="sm" onClick={exportInventoryCsv} variant="outline" className="text-xs h-8">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export to CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Min Threshold</th>
                    <th className="p-3">Average Price</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {inventoryItems.map((item) => {
                    const currentStock = item.inventory?.current_stock || 0;
                    const minStock = item.minimum_stock || 0;
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/50">
                        <td className="p-3 font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.name}
                        </td>
                        <td className="p-3 text-neutral-500">{item.category?.name}</td>
                        <td className="p-3 font-bold text-neutral-900 dark:text-neutral-100">
                          {currentStock} {item.base_unit}
                        </td>
                        <td className="p-3 text-neutral-500">
                          {minStock} {item.base_unit}
                        </td>
                        <td className="p-3">
                          {formatCurrency(Number(item.inventory?.average_purchase_price || 0))}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={currentStock <= 0 ? "destructive" : currentStock <= minStock ? "warning" : "success"}
                            className="text-[10px] py-0"
                          >
                            {currentStock <= 0 ? "Out of Stock" : currentStock <= minStock ? "Low Stock" : "In Stock"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contributions Tab */}
        <TabsContent value="contributions" className="pt-3">
          <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <CardTitle className="text-sm font-semibold">Monthly Dues & Contributions</CardTitle>
                <CardDescription className="text-xs">
                  {contributions.length} total payments into the shared fund.
                </CardDescription>
              </div>
              <Button size="sm" onClick={exportContributionsCsv} variant="outline" className="text-xs h-8">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export to CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="p-3">Flatmate</th>
                    <th className="p-3">Period Month</th>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {contributions.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/50">
                      <td className="p-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        {c.member?.profile?.full_name}
                      </td>
                      <td className="p-3">{c.period_month}</td>
                      <td className="p-3">{formatDate(c.payment_date)}</td>
                      <td className="p-3">{c.payment_method}</td>
                      <td className="p-3 text-neutral-400">{c.reference_id || "-"}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {formatCurrency(Number(c.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements" className="pt-3">
          <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <CardTitle className="text-sm font-semibold">Settlement Payments Report</CardTitle>
                <CardDescription className="text-xs">
                  {settlements.length} total debt clearing settlements.
                </CardDescription>
              </div>
              <Button size="sm" onClick={exportSettlementsCsv} variant="outline" className="text-xs h-8">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export to CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">From (Debtor)</th>
                    <th className="p-3">To (Creditor)</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/50">
                      <td className="p-3">{formatDate(s.settlement_date)}</td>
                      <td className="p-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        {s.from_member?.profile?.full_name}
                      </td>
                      <td className="p-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        {s.to_member?.profile?.full_name}
                      </td>
                      <td className="p-3">{s.payment_method}</td>
                      <td className="p-3">
                        <Badge variant="success" className="text-[10px] py-0">
                          {s.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(Number(s.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

