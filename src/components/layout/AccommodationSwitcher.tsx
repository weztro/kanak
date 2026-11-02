"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Accommodation } from "@/types/database";
import { switchAccommodationAction } from "@/server/actions/accommodation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  accommodations: Accommodation[];
  activeId: string | null;
}

export function AccommodationSwitcher({ accommodations, activeId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleSelect = (val: string) => {
    if (val === "new") {
      router.push("/onboarding");
      return;
    }

    startTransition(async () => {
      try {
        const res = await switchAccommodationAction(val);
        if (!res.success) {
          toast.error(res.error || "Failed to switch accommodation");
          return;
        }
        toast.success("Switched accommodation");
        router.refresh();
      } catch {
        toast.error("Failed to switch accommodation");
      }
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        defaultValue={activeId || accommodations[0]?.id || ""}
        onValueChange={handleSelect}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 w-48 text-xs font-medium border-neutral-200 dark:border-neutral-800 bg-white/50 backdrop-blur-xs">
          <div className="flex items-center space-x-1.5 truncate">
            <Building2 className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
            <SelectValue placeholder="Select Pad" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="text-xs">
          {accommodations.map((acc) => (
            <SelectItem key={acc.id} value={acc.id} className="text-xs">
              {acc.name}
            </SelectItem>
          ))}
          <SelectItem value="new" className="text-xs text-neutral-500 font-medium">
            <span className="flex items-center">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create or Join Pad
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

