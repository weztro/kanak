import * as React from "react";
import { getPurchases } from "@/server/actions/purchases";
import { getExpenses } from "@/server/actions/expenses";
import { getContributions } from "@/server/actions/contributions";
import { getConsumptionLogs } from "@/server/actions/consumption";
import { getSettlementHistory, getMemberBalancesData } from "@/server/actions/settlements";
import { getInventoryItems } from "@/server/actions/inventory";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const purchases = await getPurchases();
  const expenses = await getExpenses();
  const contributions = await getContributions();
  const consumptionLogs = await getConsumptionLogs();
  const settlements = await getSettlementHistory();
  const { balances } = await getMemberBalancesData();
  const inventoryItems = await getInventoryItems();

  return (
    <div className="space-y-6">
      <ReportsClient
        purchases={purchases}
        expenses={expenses}
        contributions={contributions}
        consumptionLogs={consumptionLogs}
        settlements={settlements}
        balances={balances}
        inventoryItems={inventoryItems}
      />
    </div>
  );
}

