"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Member, PaymentSource } from "@/types/database";
import { createExpenseAction } from "@/server/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Check } from "lucide-react";

interface Props {
  members: Member[];
}

export function NewExpenseForm({ members }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<string>("Electricity");
  const [amount, setAmount] = React.useState<number>(0);
  const [paidBy, setPaidBy] = React.useState(members[0]?.id || "");
  const [paymentSource, setPaymentSource] = React.useState<PaymentSource>("PERSONAL");
  const [expenseDate, setExpenseDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0 || !paidBy) {
      toast.error("Please fill in description, valid amount, and payer");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createExpenseAction({
        description: description.trim(),
        category,
        amount: Number(amount),
        paidBy,
        paymentSource,
        expenseDate,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to post expense");
        setIsSubmitting(false);
        return;
      }

      toast.success("Expense recorded and allocated equally!");
      router.push("/expenses");
      router.refresh();
    } catch {
      toast.error("Failed to record expense");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
      <form onSubmit={handleSubmit}>
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <CardTitle className="text-sm font-semibold">Expense Details</CardTitle>
          <CardDescription className="text-xs">
            Shared expense will be divided equally across active flatmates.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-medium">Description</label>
            <Input
              placeholder="e.g. Electricity Bill for October, 20L Water Can x5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-1">
              <label className="text-xs font-medium">Amount (₹)</label>
              <Input
                type="number"
                step="any"
                placeholder="1000"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Paid By</label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger className="h-8 text-xs">
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

            <div className="space-y-1">
              <label className="text-xs font-medium">Payment Source</label>
              <Select
                value={paymentSource}
                onValueChange={(v) => setPaymentSource(v as PaymentSource)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">
                    Personal Money (Recorded as Member Advance)
                  </SelectItem>
                  <SelectItem value="COMMON_FUND">
                    Common Fund (Deducted from shared pool)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Expense Date</label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Notes (Optional)</label>
              <Input
                placeholder="Reference details or comments"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-neutral-100 p-4 dark:border-neutral-800">
          <Link href="/expenses">
            <Button variant="ghost" size="sm" className="text-xs">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
          </Link>
          <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs font-medium">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Post Expense
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

