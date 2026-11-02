import * as React from "react";
import { notFound } from "next/navigation";
import { getPurchaseById } from "@/server/actions/purchases";
import { createClient } from "@/lib/supabase/server";
import { PurchaseDetailClient } from "./PurchaseDetailClient";
import { ExpenseAllocation } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchase = await getPurchaseById(id);

  if (!purchase) {
    notFound();
  }

  // Fetch expense allocations for this purchase
  const supabase = await createClient();
  const { data: allocations } = await supabase
    .from("expense_allocations")
    .select(`
      *,
      member:members(
        id,
        role,
        profile:profiles(id, full_name, avatar_url)
      )
    `)
    .eq("expense_type", "PURCHASE")
    .eq("expense_id", id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PurchaseDetailClient
        purchase={purchase}
        allocations={(allocations as unknown as ExpenseAllocation[]) || []}
      />
    </div>
  );
}

