import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId, getUserAccommodations } from "@/server/actions/accommodation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { QuickActionFAB } from "@/components/layout/QuickActionFAB";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accommodations = await getUserAccommodations();
  const activeAccId = await getActiveAccommodationId();

  // If user has no accommodation, redirect to onboarding
  if (accommodations.length === 0) {
    redirect("/onboarding");
  }

  const activeAcc = accommodations.find((a) => a.id === activeAccId) || accommodations[0];

  return (
    <div className="flex min-h-screen bg-neutral-50/60 dark:bg-neutral-950 font-sans">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          accommodations={accommodations}
          activeAccommodationId={activeAcc?.id || null}
          userName={user.user_metadata?.full_name || user.email?.split("@")[0]}
          userEmail={user.email}
        />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-12 max-w-7xl w-full mx-auto">
          <PwaInstallBanner />
          {children}
        </main>
        <MobileNav />
        <QuickActionFAB />
      </div>
    </div>
  );
}

