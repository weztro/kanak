"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Purchase, ExpenseAllocation } from "@/types/database";
import { cancelPurchaseAction } from "@/server/actions/purchases";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BillPreviewModal } from "@/components/bills/BillPreviewModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Props {
  purchase: Purchase;
  allocations: ExpenseAllocation[];
}

export function PurchaseDetailClient({ purchase, allocations }: Props) {
  const router = useRouter();
  const [billOpen, setBillOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const isCancelled = purchase.status === "CANCELLED";

  const handleCancelPurchase = async () => {
    setIsCancelling(true);
    try {
      const res = await cancelPurchaseAction(purchase.id);
      if (!res.success) {
        toast.error(res.error || "Failed to cancel purchase");
        return;
      }
      toast.success("Purchase cancelled and stock reversed");
      setCancelOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to cancel purchase");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link href="/purchases">
          <Button variant="ghost" size="sm" className="text-xs">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Purchases
          </Button>
        </Link>
        {!isCancelled && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCancelOpen(true)}
            className="text-xs h-8"
          >
            Cancel & Reverse Purchase
          </Button>
        )}
      </div>

      {/* Main Details Card */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {purchase.shop_name}
                </span>
                <Badge
                  variant={isCancelled ? "destructive" : "success"}
                  className="text-xs py-0"
                >
                  {purchase.status}
                </Badge>
                <Badge variant="outline" className="text-xs py-0">
                  {purchase.payment_source === "COMMON_FUND"
                    ? "Common Fund"
                    : "Personal Money"}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Transaction ID: <span className="font-mono">{purchase.id}</span>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-neutral-400 block">Total Amount</span>
              <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(Number(purchase.total_amount))}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-800/40">
            <div>
              <span className="text-[10px] text-neutral-400 block">Purchase Date</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {formatDate(purchase.purchase_date)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 block">Paid By</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {purchase.buyer?.profile?.full_name || "Member"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 block">Payment Method</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {purchase.payment_method}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 block">Bill Receipt</span>
              {purchase.bill_file_path ? (
                <button
                  onClick={() => setBillOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center mt-0.5"
                >
                  <FileText className="mr-1 h-3 w-3" /> View Attachment
                </button>
              ) : (
                <span className="text-neutral-400">None attached</span>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              Purchased Items ({purchase.items?.length || 0})
            </span>
            <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
              {purchase.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      {item.item?.name}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {item.quantity} {item.unit} @ {formatCurrency(Number(item.unit_price))} / {item.unit}
                    </span>
                  </div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(Number(item.total_price))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal, Discount, Tax */}
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs space-y-1.5 max-w-xs ml-auto">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(purchase.subtotal))}</span>
            </div>
            {Number(purchase.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(Number(purchase.discount))}</span>
              </div>
            )}
            {Number(purchase.tax) > 0 && (
              <div className="flex justify-between text-neutral-500">
                <span>Tax / Extra</span>
                <span>+{formatCurrency(Number(purchase.tax))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-neutral-900 dark:text-neutral-100 border-t border-neutral-200 dark:border-neutral-700 pt-1.5">
              <span>Total Paid</span>
              <span>{formatCurrency(Number(purchase.total_amount))}</span>
            </div>
          </div>

          {/* Equal Expense Allocation Breakdown */}
          <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Equal Expense Allocation Among Active Flatmates
              </span>
              <span className="text-[11px] text-neutral-400">
                Total: {formatCurrency(Number(purchase.total_amount))}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="rounded-lg border border-neutral-100 p-2.5 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/30 text-xs"
                >
                  <span className="text-neutral-400 block text-[10px]">Flatmate</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                    {alloc.member?.profile?.full_name || "Member"}
                  </span>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 block">
                    {formatCurrency(Number(alloc.allocated_amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Preview Modal */}
      {purchase.bill_file_path && (
        <BillPreviewModal
          isOpen={billOpen}
          onClose={() => setBillOpen(false)}
          filePath={purchase.bill_file_path}
          fileName={purchase.bill_file_name}
          mimeType={purchase.bill_file_mime}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Cancel & Reverse Purchase</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              This will automatically decrease inventory stock via compensating reversal transactions,
              remove the expense allocations for this purchase, and refund the common fund if it was paid from it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(false)}
              disabled={isCancelling}
              className="text-xs"
            >
              Nevermind
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelPurchase}
              disabled={isCancelling}
              className="text-xs"
            >
              {isCancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Confirm Reversal"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

