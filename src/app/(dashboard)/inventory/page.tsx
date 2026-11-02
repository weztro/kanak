import * as React from "react";
import { getCategories, getInventoryItems } from "@/server/actions/inventory";
import { InventoryClient } from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const categories = await getCategories();
  const items = await getInventoryItems();

  return (
    <div className="space-y-6">
      <InventoryClient items={items} categories={categories} />
    </div>
  );
}

