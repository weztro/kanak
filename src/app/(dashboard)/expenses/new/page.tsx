import * as React from "react";
import { getActiveAccommodationMembers } from "@/server/actions/members";
import { NewExpenseForm } from "./NewExpenseForm";

export default async function NewExpensePage() {
  const members = await getActiveAccommodationMembers();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Record Shared Expense
        </h1>
        <p className="text-xs text-neutral-500">
          Record electricity, drinking water, gas cylinders, maid salaries, or repairs.
        </p>
      </div>

      <NewExpenseForm members={members} />
    </div>
  );
}

