import * as React from "react";
import { getDashboardData } from "@/server/actions/dashboard";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400">
        Loading accommodation metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardClient initialData={data} />
    </div>
  );
}

