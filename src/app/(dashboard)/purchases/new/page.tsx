import * as React from "react";
import { getInventoryItems } from "@/server/actions/inventory";
import { getActiveAccommodationMembers } from "@/server/actions/members";
import { NewPurchaseForm } from "./NewPurchaseForm";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const items = await getInventoryItems();
  const members = await getActiveAccommodationMembers();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Record Grocery Purchase
        </h1>
        <p className="text-xs text-neutral-500">
          Enter itemized grocery bills, receipt attachments, and allocate equally among flatmates.
        </p>
      </div>

      <NewPurchaseForm items={items} members={members} />
    </div>
  );
}

