import * as React from "react";
import { getCategoriesWithStats } from "@/server/actions/categories";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategoriesWithStats();

  return (
    <div className="space-y-6">
      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
