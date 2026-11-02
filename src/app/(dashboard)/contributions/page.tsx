import * as React from "react";
import { getContributions, getFundTransactions } from "@/server/actions/contributions";
import { getActiveAccommodationMembers } from "@/server/actions/members";
import { getActiveAccommodationId, getUserAccommodations } from "@/server/actions/accommodation";
import { ContributionsClient } from "./ContributionsClient";

export default async function ContributionsPage() {
  const contributions = await getContributions();
  const fundTransactions = await getFundTransactions();
  const members = await getActiveAccommodationMembers();
  const accId = await getActiveAccommodationId();
  const accommodations = await getUserAccommodations();
  const activeAcc = accommodations.find((a) => a.id === accId);

  return (
    <div className="space-y-6">
      <ContributionsClient
        contributions={contributions}
        fundTransactions={fundTransactions}
        members={members}
        defaultContribution={Number(activeAcc?.default_monthly_contribution || 0)}
      />
    </div>
  );
}

