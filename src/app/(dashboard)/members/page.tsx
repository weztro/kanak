import * as React from "react";
import { getActiveAccommodationMembers } from "@/server/actions/members";
import { getActiveAccommodationId, getUserAccommodations } from "@/server/actions/accommodation";
import { MembersClient } from "./MembersClient";

export default async function MembersPage() {
  const activeAccId = await getActiveAccommodationId();
  const accommodations = await getUserAccommodations();
  const activeAcc = accommodations.find((a) => a.id === activeAccId);
  const members = await getActiveAccommodationMembers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Pad Members
        </h1>
        <p className="text-xs text-neutral-500">
          Manage flatmates, roles, and invitations for {activeAcc?.name || "your accommodation"}.
        </p>
      </div>

      <MembersClient
        members={members}
        accommodationId={activeAccId || ""}
        inviteCode={activeAcc?.invite_code || ""}
      />
    </div>
  );
}

