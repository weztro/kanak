import * as React from "react";
import { getInventoryItems } from "@/server/actions/inventory";
import { getActiveAccommodationMembers } from "@/server/actions/members";
import { NewConsumptionForm } from "./NewConsumptionForm";

export default async function NewConsumptionPage() {
  const items = await getInventoryItems();
  const members = await getActiveAccommodationMembers();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Record Cooking Consumption
        </h1>
        <p className="text-xs text-neutral-500">
          Deduct ingredients consumed during meal preparation to maintain accurate stock levels.
        </p>
      </div>

      <NewConsumptionForm items={items} members={members} />
    </div>
  );
}

