import * as React from "react";
import { getActiveAccommodationId, getUserAccommodations } from "@/server/actions/accommodation";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const accId = await getActiveAccommodationId();
  const accommodations = await getUserAccommodations();
  const activeAcc = accommodations.find((a) => a.id === accId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Accommodation Settings
        </h1>
        <p className="text-xs text-neutral-500">
          Configure pad parameters, monthly budget, default member dues, and invite codes.
        </p>
      </div>

      <SettingsClient accommodation={activeAcc || null} />
    </div>
  );
}

