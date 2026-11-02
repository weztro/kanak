import * as React from "react";
import { getExpenses } from "@/server/actions/expenses";
import { ExpensesClient } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  return (
    <div className="space-y-6">
      <ExpensesClient expenses={expenses} />
    </div>
  );
}

