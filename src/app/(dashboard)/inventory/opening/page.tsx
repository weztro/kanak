import * as React from "react";
import { getCategories, getInventoryItems } from "@/server/actions/inventory";
import { OpeningInventoryWizard } from "./OpeningInventoryWizard";

export default async function OpeningInventoryPage() {
  const items = await getInventoryItems();
  const categories = await getCategories();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Manual Opening Inventory Setup
        </h1>
        <p className="text-xs text-neutral-500">
          Enter the initial quantities of groceries and supplies already available in your bachelor flat.
        </p>
      </div>

      <OpeningInventoryWizard items={items} categories={categories} />
    </div>
  );
}

