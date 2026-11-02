import * as React from "react";
import { getMemberBalancesData, getSettlementHistory } from "@/server/actions/settlements";
import { getActiveAccommodationMembers } from "@/server/actions/members";
import { SettlementsClient } from "./SettlementsClient";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const { balances, suggestions } = await getMemberBalancesData();
  const settlements = await getSettlementHistory();
  const members = await getActiveAccommodationMembers();

  return (
    <div className="space-y-6">
      <SettlementsClient
        balances={balances}
        suggestions={suggestions}
        settlements={settlements}
        members={members}
      />
    </div>
  );
}

