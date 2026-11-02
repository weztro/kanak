"use client";

import * as React from "react";
import { Contribution, FundTransaction, Member, PaymentMethod } from "@/types/database";
import { recordContributionAction } from "@/server/actions/contributions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Coins,
  Plus,
  Calendar,
  CreditCard,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Wallet,
  CheckCircle,
} from "lucide-react";

interface Props {
  contributions: Contribution[];
  fundTransactions: FundTransaction[];
  members: Member[];
  defaultContribution: number;
}

export function ContributionsClient({
  contributions,
  fundTransactions,
  members,
  defaultContribution,
}: Props) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states
  const [memberId, setMemberId] = React.useState(members[0]?.id || "");
  const [periodMonth, setPeriodMonth] = React.useState(
    new Date().toISOString().slice(0, 7) + "-01"
  );
  const [amount, setAmount] = React.useState<number>(defaultContribution || 5000);
  const [paymentDate, setPaymentDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("UPI");
  const [referenceId, setReferenceId] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Common Fund running balance
  const currentFundBalance =
    fundTransactions.length > 0 ? Number(fundTransactions[0].balance_after) : 0;

  const totalCollectedThisMonth = contributions
    .filter((c) => c.period_month.startsWith(periodMonth.slice(0, 7)))
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || amount <= 0) {
      toast.error("Please enter a valid member and amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordContributionAction({
        memberId,
        periodMonth,
        amount: Number(amount),
        paymentDate,
        paymentMethod,
        referenceId: referenceId.trim() || null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to record contribution");
        return;
      }

      toast.success("Contribution recorded & common fund credited!");
      setAddOpen(false);
      setReferenceId("");
      setNotes("");
    } catch {
      toast.error("Failed to record contribution");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Monthly Contributions & Common Fund
          </h1>
          <p className="text-xs text-neutral-500">
            Pool monthly dues into one shared accommodation fund for common purchases and bills.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="text-xs h-8">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Contribution
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-4">
          <div className="flex items-center space-x-2 text-neutral-500">
            <Wallet className="h-4 w-4" />
            <span className="text-[11px] font-medium">Common Fund Balance</span>
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatCurrency(currentFundBalance)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            Live unspent cash pool in flat fund
          </span>
        </Card>

        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-4">
          <div className="flex items-center space-x-2 text-neutral-500">
            <Coins className="h-4 w-4" />
            <span className="text-[11px] font-medium">Default Monthly Due / Member</span>
          </div>
          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 block">
            {formatCurrency(defaultContribution)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            Expected standard contribution
          </span>
        </Card>

        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 p-4">
          <div className="flex items-center space-x-2 text-neutral-500">
            <CheckCircle className="h-4 w-4" />
            <span className="text-[11px] font-medium">Collected for Current Month</span>
          </div>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
            {formatCurrency(totalCollectedThisMonth)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            Across {members.length} registered flatmates
          </span>
        </Card>
      </div>

      {/* Member Monthly Dues Breakdown Card */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <CardTitle className="text-sm font-semibold">Flatmate Dues Status</CardTitle>
          <CardDescription className="text-xs">
            Tracking paid vs pending contributions for active members.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
          {members.map((mem) => {
            const memberPaid = contributions
              .filter((c) => c.member_id === mem.id && c.period_month.startsWith(periodMonth.slice(0, 7)))
              .reduce((sum, c) => sum + Number(c.amount), 0);

            const pending = Math.max(0, defaultContribution - memberPaid);
            const isFull = memberPaid >= defaultContribution;

            return (
              <div
                key={mem.id}
                className="flex items-center justify-between p-3.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                    {mem.profile?.full_name?.charAt(0) || "M"}
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      {mem.profile?.full_name || "Member"}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Paid: {formatCurrency(memberPaid)} / Expected: {formatCurrency(defaultContribution)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <Badge
                    variant={isFull ? "success" : memberPaid > 0 ? "warning" : "destructive"}
                    className="text-[10px] py-0"
                  >
                    {isFull ? "Paid" : memberPaid > 0 ? "Partially Paid" : "Pending"}
                  </Badge>
                  {pending > 0 && (
                    <span className="text-[10px] text-red-500 block mt-0.5">
                      Due: {formatCurrency(pending)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Tabs: Contribution Logs vs Common Fund Ledger */}
      <Tabs defaultValue="contributions">
        <TabsList className="grid w-full sm:w-80 grid-cols-2">
          <TabsTrigger value="contributions" className="text-xs">
            Contributions Log
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">
            Fund In/Out Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contributions" className="pt-3">
          <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
            <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
              {contributions.length === 0 ? (
                <p className="p-8 text-center text-xs text-neutral-400">
                  No contributions recorded yet.
                </p>
              ) : (
                contributions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {c.member?.profile?.full_name || "Member"}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {c.payment_method}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-neutral-400 mt-0.5">
                        <span>Paid: {formatDate(c.payment_date)}</span>
                        {c.reference_id && <span>Ref: {c.reference_id}</span>}
                        {c.notes && <span className="italic">&quot;{c.notes}&quot;</span>}
                      </div>
                    </div>

                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(Number(c.amount))}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="pt-3">
          <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
            <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
              {fundTransactions.length === 0 ? (
                <p className="p-8 text-center text-xs text-neutral-400">
                  No fund ledger entries yet.
                </p>
              ) : (
                fundTransactions.map((tx) => {
                  const isInflow = Number(tx.amount) > 0;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isInflow
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                          }`}
                        >
                          {isInflow ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {tx.notes || tx.transaction_type}
                            </span>
                            <Badge variant="secondary" className="text-[10px] py-0">
                              {tx.transaction_type}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-neutral-400 mt-0.5 block">
                            {formatDate(tx.created_at)} • Recorded by {tx.recorder?.full_name || "System"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold text-sm block ${
                            isInflow
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-neutral-900 dark:text-neutral-100"
                          }`}
                        >
                          {isInflow ? "+" : ""}
                          {formatCurrency(Number(tx.amount))}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Balance: {formatCurrency(Number(tx.balance_after))}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Contribution Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Record Monthly Contribution</DialogTitle>
            <DialogDescription className="text-xs">
              Deposit dues into the shared accommodation fund pool.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Flatmate</label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.profile?.full_name || "Member"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Month</label>
                <Input
                  type="date"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Amount (₹)</label>
                <Input
                  type="number"
                  step="any"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Payment Date</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Payment Method</label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Reference / UPI ID (Optional)</label>
              <Input
                placeholder="e.g. UPI Ref #4123456789"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                disabled={isSubmitting}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Notes (Optional)</label>
              <Input
                placeholder="e.g. November monthly advance contribution"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                className="text-xs h-8"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full text-xs mt-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Contribution"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

