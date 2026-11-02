import * as React from "react";
import { getShoppingListItems } from "@/server/actions/shopping";
import { getInventoryItems } from "@/server/actions/inventory";
import { getActiveAccommodationMembers } from "@/server/actions/members";
import { ShoppingListClient } from "./ShoppingListClient";

export default async function ShoppingPage() {
  const shoppingItems = await getShoppingListItems();
  const catalogItems = await getInventoryItems();
  const members = await getActiveAccommodationMembers();

  return (
    <div className="space-y-6">
      <ShoppingListClient
        shoppingItems={shoppingItems}
        catalogItems={catalogItems}
        members={members}
      />
    </div>
  );
}

