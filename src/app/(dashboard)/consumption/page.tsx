import * as React from "react";
import { getConsumptionLogs } from "@/server/actions/consumption";
import { ConsumptionClient } from "./ConsumptionClient";

export default async function ConsumptionPage() {
  const logs = await getConsumptionLogs();

  return (
    <div className="space-y-6">
      <ConsumptionClient logs={logs} />
    </div>
  );
}

