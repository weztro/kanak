"use client";

import * as React from "react";
import { MemberBalanceRow, Settlement, Member, PaymentMethod } from "@/types/database";
import { SettlementSuggestion } from "@/lib/settlements/debt-simplifier";
import { recordSettlementAction } from "@/server/actions/settlements";
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
import { toast } from "sonner";
import {
  Scale,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Loader2,
  HandCoins,
  History,
} from "lucide-react";

interface Props {
  balances: MemberBalanceRow[];
  suggestions: SettlementSuggestion[];
  settlements: Settlement[];
  members: Member[];
}

export function SettlementsClient({
  balances,
  suggestions,
  settlements,
  members,
}: Props) {
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Settle up modal state
  const [fromMemberId, setFromMemberId] = React.useState("");
  const [toMemberId, setToMemberId] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [settlementDate, setSettlementDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("UPI");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const handleOpenSettleSuggestion = (sug: SettlementSuggestion) => {
    setFromMemberId(sug.from_member_id);
    setToMemberId(sug.to_member_id);
    setAmount(sug.amount);
    setSettleOpen(true);
  };

  const handleOpenCustomSettle = () => {
    if (members.length >= 2) {
      setFromMemberId(members[0].id);
      setToMemberId(members[1].id);
      setAmount(100);
      setSettleOpen(true);
    }
  };

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromMemberId || !toMemberId || fromMemberId === toMemberId || amount <= 0) {
      toast.error("Please enter valid debtor, creditor, and settlement amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordSettlementAction({
        fromMemberId,
        toMemberId,
        amount: Number(amount),
        settlementDate,
        paymentMethod,
        transactionReference: reference.trim() || null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to record settlement");
        setIsSubmitting(false);
        return;
      }

      toast.success("Settlement recorded & balances updated!");
      setSettleOpen(false);
      setReference("");
      setNotes("");
    } catch {
      toast.error("Failed to record settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Net Balances & Debt Settlements
          </h1>
          <p className="text-xs text-neutral-500">
            Authoritative net balance matrix and automated debt simplification algorithm.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCustomSettle} className="text-xs h-8">
          <HandCoins className="mr-1.5 h-3.5 w-3.5" /> Settle Up
        </Button>
      </div>

      {/* Suggested Minimal Settlement Transactions */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center space-x-1.5">
                <Scale className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <span>Optimal Settlement Plan</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Minimal cash transfers required to completely clear all inter-flatmate debts.
              </CardDescription>
            </div>
            {suggestions.length === 0 && (
              <Badge variant="success" className="text-xs py-0">
                All Settled Up!
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {suggestions.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-500">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                Everyone is even!
              </p>
              <p className="text-neutral-400 mt-0.5">
                No outstanding debts among flatmates right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-850"
                >
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {sug.from_member_name}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {sug.to_member_name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(sug.amount)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenSettleSuggestion(sug)}
                      className="text-xs h-7 px-2.5"
                    >
                      Pay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Net Balance Ledger Table */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <CardTitle className="text-sm font-semibold">
            Member Balance Breakdown Matrix
          </CardTitle>
          <CardDescription className="text-xs">
            Contributions + Personal Advances - Allocated Expenses - Reimbursements + Settlements Paid - Settlements Received
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 font-medium border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="p-3">Member</th>
                <th className="p-3">Contributions</th>
                <th className="p-3">Personal Advances</th>
                <th className="p-3">Allocated Share</th>
                <th className="p-3">Settlements (+/-)</th>
                <th className="p-3 text-right">Net Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {balances.map((b) => {
                const net = Number(b.net_balance);
                const isCreditor = net > 0.01;
                const isDebtor = net < -0.01;

                return (
                  <tr
                    key={b.member_id}
                    className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20"
                  >
                    <td className="p-3 font-semibold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {b.full_name.charAt(0)}
                      </div>
                      <span>{b.full_name}</span>
                    </td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(Number(b.total_contributions))}
                    </td>
                    <td className="p-3 text-blue-600 dark:text-blue-400 font-medium">
                      {formatCurrency(Number(b.personal_advances))}
                    </td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(Number(b.allocated_expenses))}
                    </td>
                    <td className="p-3 text-neutral-500">
                      +{formatCurrency(Number(b.settlements_paid))} / -{formatCurrency(Number(b.settlements_received))}
                    </td>
                    <td className="p-3 text-right font-bold">
                      <span
                        className={
                          isCreditor
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isDebtor
                            ? "text-red-600 dark:text-red-400"
                            : "text-neutral-500"
                        }
                      >
                        {isCreditor ? "+" : ""}
                        {formatCurrency(net)}
                      </span>
                      <span className="block text-[9px] font-normal text-neutral-400">
                        {isCreditor ? "Should receive" : isDebtor ? "Owes" : "Settled"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Settlement History */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <CardTitle className="text-sm font-semibold flex items-center space-x-1.5">
            <History className="h-4 w-4 text-neutral-500" />
            <span>Settlement History ({settlements.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
          {settlements.length === 0 ? (
            <p className="p-6 text-center text-xs text-neutral-400">
              No settlements recorded yet.
            </p>
          ) : (
            settlements.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {s.from_member?.profile?.full_name || "Debtor"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-neutral-400" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {s.to_member?.profile?.full_name || "Creditor"}
                    </span>
                    <Badge variant="success" className="text-[10px] py-0">
                      {s.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-neutral-400 mt-0.5">
                    <span>{formatDate(s.settlement_date)}</span>
                    <span>Method: {s.payment_method}</span>
                    {s.transaction_reference && <span>Ref: {s.transaction_reference}</span>}
                    {s.notes && <span className="italic">&quot;{s.notes}&quot;</span>}
                  </div>
                </div>

                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(Number(s.amount))}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Settle Up Dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Record Settlement Payment</DialogTitle>
            <DialogDescription className="text-xs">
              Record payment from one flatmate to another to balance mutual dues.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitSettlement} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">From (Debtor)</label>
                <Select value={fromMemberId} onValueChange={setFromMemberId}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.profile?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">To (Creditor)</label>
                <Select value={toMemberId} onValueChange={setToMemberId}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.profile?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Settlement Amount (₹)</label>
                <Input
                  type="number"
                  step="any"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Date</label>
                <Input
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

              <div className="space-y-1">
                <label className="text-xs font-medium">Transaction Reference</label>
                <Input
                  placeholder="UPI ID / Ref #"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Notes (Optional)</label>
              <Input
                placeholder="e.g. Settled grocery advance for DMart run"
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
                "Confirm & Record Settlement"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

