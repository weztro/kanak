import * as React from "react";
import { getPurchases } from "@/server/actions/purchases";
import { PurchasesClient } from "./PurchasesClient";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const purchases = await getPurchases();

  return (
    <div className="space-y-6">
      <PurchasesClient purchases={purchases} />
    </div>
  );
}

