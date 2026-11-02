"use client";

import * as React from "react";
import { Accommodation } from "@/types/database";
import { updateAccommodationSettingsAction } from "@/server/actions/accommodation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Copy, Check, Loader2 } from "lucide-react";

interface Props {
  accommodation: Accommodation | null;
}

export function SettingsClient({ accommodation }: Props) {
  const [copied, setCopied] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [name, setName] = React.useState(accommodation?.name || "");
  const [monthlyBudget, setMonthlyBudget] = React.useState(
    Number(accommodation?.monthly_budget || 0)
  );
  const [defaultMonthlyContribution, setDefaultMonthlyContribution] = React.useState(
    Number(accommodation?.default_monthly_contribution || 0)
  );
  const [currency, setCurrency] = React.useState(accommodation?.currency || "INR");

  if (!accommodation) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400">
        No active accommodation selected.
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accommodation.invite_code);
    setCopied(true);
    toast.success("Invite code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Accommodation name cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateAccommodationSettingsAction(accommodation.id, {
        name,
        monthlyBudget: Number(monthlyBudget),
        defaultMonthlyContribution: Number(defaultMonthlyContribution),
        currency,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update settings");
        return;
      }

      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Code Share Card */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Accommodation Invite Code</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              FLATMATE ONBOARDING
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Share this code with your flatmates so they can join this accommodation upon registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center space-x-2">
          <div className="flex h-10 flex-1 items-center rounded-lg border border-neutral-200 bg-neutral-50 px-3 font-mono text-sm font-bold uppercase tracking-wider text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
            {accommodation.invite_code}
          </div>
          <Button onClick={handleCopyCode} variant="outline" className="h-10 text-xs">
            {copied ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <CardTitle className="text-sm font-semibold">Accommodation Parameters</CardTitle>
            <CardDescription className="text-xs">
              Manage flat name, budgets, and monthly dues expectations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-medium">Accommodation Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Monthly Budget (₹)</label>
                <Input
                  type="number"
                  step="any"
                  value={monthlyBudget || ""}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Default Monthly Due / Member (₹)</label>
                <Input
                  type="number"
                  step="any"
                  value={defaultMonthlyContribution || ""}
                  onChange={(e) => setDefaultMonthlyContribution(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Currency</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-neutral-100 p-4 dark:border-neutral-800">
            <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs font-medium">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

