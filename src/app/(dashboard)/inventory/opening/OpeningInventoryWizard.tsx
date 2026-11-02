"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Item, Category } from "@/types/database";
import { recordOpeningInventoryAction } from "@/server/actions/inventory";
import { SUPPORTED_UNITS } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Package, Plus, Trash2, ArrowLeft, Loader2, Check } from "lucide-react";
import Link from "next/link";

interface Row {
  id: string;
  itemId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface Props {
  items: Item[];
  categories: Category[];
}

export function OpeningInventoryWizard({ items }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [rows, setRows] = React.useState<Row[]>(() => {
    if (items.length > 0) {
      // Prepopulate first 3 items or default 1 item
      return items.slice(0, 3).map((item, idx) => ({
        id: `row-${idx}`,
        itemId: item.id,
        quantity: 0,
        unit: item.base_unit,
        unitPrice: 0,
      }));
    }
    return [];
  });

  const handleAddRow = () => {
    if (items.length === 0) {
      toast.error("Please add items to your catalog first");
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        itemId: items[0].id,
        quantity: 1,
        unit: items[0].base_unit,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof Row, val: unknown) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "itemId") {
          const selected = items.find((i) => i.id === val);
          return {
            ...r,
            itemId: val as string,
            unit: selected?.base_unit || r.unit,
          };
        }
        return { ...r, [field]: val };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.itemId && r.quantity > 0);
    if (validRows.length === 0) {
      toast.error("Please enter quantity for at least one item");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map((r) => ({
        itemId: r.itemId,
        quantity: Number(r.quantity),
        unit: r.unit,
        unitPrice: Number(r.unitPrice),
      }));

      const res = await recordOpeningInventoryAction(payload);
      if (!res.success) {
        toast.error(res.error || "Failed to record opening inventory");
        return;
      }

      toast.success(`Opening inventory recorded for ${validRows.length} items!`);
      router.push("/inventory");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-neutral-200 shadow-xs dark:border-neutral-800">
        <Package className="mx-auto h-10 w-10 text-neutral-400" />
        <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          No items in catalog
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          You need to add items to your catalog before recording opening inventory.
        </p>
        <Link href="/inventory" className="mt-4 inline-block">
          <Button size="sm" className="text-xs">
            <Plus className="mr-1 h-3 w-3" /> Create Catalog Items
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
      <form onSubmit={handleSubmit}>
        <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <CardTitle className="text-sm font-semibold">Opening Stock Entries</CardTitle>
          <CardDescription className="text-xs">
            Enter stock counts and optional estimated cost per unit.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/30"
            >
              <div className="flex-1">
                <label className="text-[10px] font-medium text-neutral-400 block mb-1">
                  Item
                </label>
                <Select
                  value={row.itemId}
                  onValueChange={(val) => updateRow(row.id, "itemId", val)}
                >
                  <SelectTrigger className="text-xs h-8 bg-white dark:bg-neutral-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} ({i.category?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-28">
                <label className="text-[10px] font-medium text-neutral-400 block mb-1">
                  Quantity
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={row.quantity || ""}
                  onChange={(e) => updateRow(row.id, "quantity", Number(e.target.value))}
                  className="h-8 text-xs bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="w-full sm:w-32">
                <label className="text-[10px] font-medium text-neutral-400 block mb-1">
                  Unit
                </label>
                <Select
                  value={row.unit}
                  onValueChange={(val) => updateRow(row.id, "unit", val)}
                >
                  <SelectTrigger className="text-xs h-8 bg-white dark:bg-neutral-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-32">
                <label className="text-[10px] font-medium text-neutral-400 block mb-1">
                  Est. Unit Price (₹)
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={row.unitPrice || ""}
                  onChange={(e) => updateRow(row.id, "unitPrice", Number(e.target.value))}
                  className="h-8 text-xs bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="flex items-end justify-end pt-2 sm:pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveRow(row.id)}
                  className="h-8 w-8 text-neutral-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="text-xs h-8 w-full border-dashed"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Item
          </Button>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-neutral-100 p-4 dark:border-neutral-800">
          <Link href="/inventory">
            <Button variant="ghost" size="sm" className="text-xs">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
          </Link>
          <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs font-medium">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Commit Opening Inventory
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

