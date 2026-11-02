"use client";

import * as React from "react";
import Link from "next/link";
import { Purchase } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BillPreviewModal } from "@/components/bills/BillPreviewModal";
import {
  ShoppingCart,
  Plus,
  Search,
  FileText,
  Calendar,
  CreditCard,
  User,
  ArrowRight,
  Receipt,
  XCircle,
} from "lucide-react";

interface Props {
  purchases: Purchase[];
}

export function PurchasesClient({ purchases }: Props) {
  const [search, setSearch] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Bill preview state
  const [previewFile, setPreviewFile] = React.useState<{
    path: string;
    name?: string | null;
    mime?: string | null;
  } | null>(null);

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.shop_name.toLowerCase().includes(search.toLowerCase()) ||
      p.buyer?.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      (p.items && p.items.some((i) => i.item?.name.toLowerCase().includes(search.toLowerCase())));

    const matchesSource = sourceFilter === "ALL" || p.payment_source === sourceFilter;
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  const totalSpent = filteredPurchases
    .filter((p) => p.status === "POSTED")
    .reduce((sum, p) => sum + Number(p.total_amount), 0);

  const personalAdvances = filteredPurchases
    .filter((p) => p.status === "POSTED" && p.payment_source === "PERSONAL")
    .reduce((sum, p) => sum + Number(p.total_amount), 0);

  const commonFundOutflow = filteredPurchases
    .filter((p) => p.status === "POSTED" && p.payment_source === "COMMON_FUND")
    .reduce((sum, p) => sum + Number(p.total_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Grocery Purchases
          </h1>
          <p className="text-xs text-neutral-500">
            Itemized groceries bought individually or via the common accommodation fund.
          </p>
        </div>
        <Link href="/purchases/new">
          <Button size="sm" className="text-xs h-8">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Purchase
          </Button>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-4">
          <span className="text-[11px] font-medium text-neutral-400 block">Total Grocery Purchases</span>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1 block">
            {formatCurrency(totalSpent)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            {filteredPurchases.filter((p) => p.status === "POSTED").length} posted purchases
          </span>
        </Card>

        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-4">
          <span className="text-[11px] font-medium text-neutral-400 block">Member Personal Advances</span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1 block">
            {formatCurrency(personalAdvances)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            Paid out-of-pocket (settled via matrix)
          </span>
        </Card>

        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-4">
          <span className="text-[11px] font-medium text-neutral-400 block">Common Fund Outflow</span>
          <span className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1 block">
            {formatCurrency(commonFundOutflow)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            Deducted from shared pool
          </span>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Search shop, items, or buyer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <div className="flex space-x-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Payment Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="PERSONAL">Personal Money</SelectItem>
                  <SelectItem value="COMMON_FUND">Common Fund</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="POSTED">Posted</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-neutral-200 dark:border-neutral-800">
          <ShoppingCart className="mx-auto h-10 w-10 text-neutral-400" />
          <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            No purchases found
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            {search || sourceFilter !== "ALL" || statusFilter !== "ALL"
              ? "No purchases match your selected filters."
              : "Whenever you or a flatmate buys groceries, add the purchase here."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPurchases.map((purchase) => {
            const itemCount = purchase.items?.length || 0;
            const isCancelled = purchase.status === "CANCELLED";

            return (
              <Card
                key={purchase.id}
                className={`border-neutral-200/80 shadow-xs hover:border-neutral-300 dark:border-neutral-800 transition-all ${
                  isCancelled ? "opacity-60 bg-neutral-50/50 dark:bg-neutral-900/50" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {purchase.shop_name}
                        </span>
                        <Badge
                          variant={purchase.payment_source === "COMMON_FUND" ? "secondary" : "outline"}
                          className="text-[10px] py-0"
                        >
                          {purchase.payment_source === "COMMON_FUND" ? "Common Fund" : "Personal Money"}
                        </Badge>
                        <Badge
                          variant={isCancelled ? "destructive" : "success"}
                          className="text-[10px] py-0"
                        >
                          {purchase.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" /> {formatDate(purchase.purchase_date)}
                        </span>
                        <span className="flex items-center">
                          <User className="mr-1 h-3 w-3" /> Paid by{" "}
                          <strong className="ml-1 text-neutral-700 dark:text-neutral-300">
                            {purchase.buyer?.profile?.full_name || "Member"}
                          </strong>
                        </span>
                        <span className="flex items-center">
                          <CreditCard className="mr-1 h-3 w-3" /> {purchase.payment_method}
                        </span>
                        <span>{itemCount} items</span>
                      </div>

                      {purchase.items && purchase.items.length > 0 && (
                        <p className="text-[11px] text-neutral-500 truncate max-w-xl">
                          {purchase.items.map((i) => `${i.item?.name} (${i.quantity} ${i.unit})`).join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                      <div className="text-right">
                        <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 block">
                          {formatCurrency(Number(purchase.total_amount))}
                        </span>
                        {Number(purchase.discount) > 0 && (
                          <span className="text-[10px] text-emerald-600 block">
                            Saved {formatCurrency(Number(purchase.discount))}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {purchase.bill_file_path && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setPreviewFile({
                                path: purchase.bill_file_path!,
                                name: purchase.bill_file_name,
                                mime: purchase.bill_file_mime,
                              })
                            }
                            className="h-8 w-8 text-neutral-600"
                            title="View Receipt Bill"
                          >
                            <FileText className="h-4 w-4 text-neutral-600" />
                          </Button>
                        )}
                        <Link href={`/purchases/${purchase.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowRight className="h-4 w-4 text-neutral-400 hover:text-neutral-900" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bill Preview Modal */}
      {previewFile && (
        <BillPreviewModal
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          filePath={previewFile.path}
          fileName={previewFile.name}
          mimeType={previewFile.mime}
        />
      )}
    </div>
  );
}

