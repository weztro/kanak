"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Item, Member, MealType } from "@/types/database";
import { recordConsumptionAction } from "@/server/actions/consumption";
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
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Check,
} from "lucide-react";

interface IngredientRow {
  id: string;
  itemId: string;
  quantity: number;
  unit: string;
}

interface Props {
  items: Item[];
  members: Member[];
}

export function NewConsumptionForm({ items, members }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states
  const [consumptionDate, setConsumptionDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [mealType, setMealType] = React.useState<MealType>("Dinner");
  const [recordedBy, setRecordedBy] = React.useState(members[0]?.id || "");
  const [notes, setNotes] = React.useState("");

  const [ingredientRows, setIngredientRows] = React.useState<IngredientRow[]>(() => {
    if (items.length > 0) {
      return [
        {
          id: `ing-${Date.now()}`,
          itemId: items[0].id,
          quantity: 1,
          unit: items[0].base_unit,
        },
      ];
    }
    return [];
  });

  const handleAddIngredient = () => {
    if (items.length === 0) {
      toast.error("No items in catalog. Add inventory items first.");
      return;
    }
    setIngredientRows((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}-${Math.random()}`,
        itemId: items[0].id,
        quantity: 1,
        unit: items[0].base_unit,
      },
    ]);
  };

  const handleRemoveIngredient = (id: string) => {
    if (ingredientRows.length <= 1) {
      toast.error("At least one ingredient is required");
      return;
    }
    setIngredientRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateIngredientRow = (id: string, field: keyof IngredientRow, val: unknown) => {
    setIngredientRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        if (field === "itemId") {
          const selected = items.find((i) => i.id === val);
          if (selected) {
            updated.unit = selected.base_unit;
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedBy) {
      toast.error("Please select who cooked or recorded this meal");
      return;
    }

    const validItems = ingredientRows.filter((r) => r.itemId && r.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one ingredient with a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        consumptionDate,
        mealType,
        recordedBy,
        notes: notes.trim() || null,
        items: validItems.map((r) => ({
          itemId: r.itemId,
          quantity: Number(r.quantity),
          unit: r.unit,
        })),
      };

      const res = await recordConsumptionAction(payload);
      if (!res.success) {
        toast.error(res.error || "Failed to record consumption");
        setIsSubmitting(false);
        return;
      }

      toast.success("Cooking consumption logged & inventory updated!");
      router.push("/consumption");
      router.refresh();
    } catch {
      toast.error("An error occurred while saving consumption log.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
      <form onSubmit={handleSubmit}>
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <CardTitle className="text-sm font-semibold">Meal Details</CardTitle>
          <CardDescription className="text-xs">
            Specify meal session, date, and flatmate.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Date</label>
              <Input
                type="date"
                value={consumptionDate}
                onChange={(e) => setConsumptionDate(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Meal Type</label>
              <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Breakfast">Breakfast</SelectItem>
                  <SelectItem value="Lunch">Lunch</SelectItem>
                  <SelectItem value="Dinner">Dinner</SelectItem>
                  <SelectItem value="Snacks">Snacks</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Cooked / Recorded By</label>
              <Select value={recordedBy} onValueChange={setRecordedBy}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.profile?.full_name || "Member"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ingredients Rows */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Ingredients Consumed ({ingredientRows.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddIngredient}
                className="h-7 text-[11px]"
              >
                <Plus className="mr-1 h-3 w-3" /> Add Ingredient
              </Button>
            </div>

            <div className="space-y-2">
              {ingredientRows.map((row) => {
                const itemObj = items.find((i) => i.id === row.itemId);
                const currentStock = itemObj?.inventory?.current_stock || 0;

                return (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5 rounded-lg border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] font-medium text-neutral-400">
                          Ingredient
                        </label>
                        <span className="text-[10px] text-neutral-400">
                          In stock: {currentStock} {itemObj?.base_unit}
                        </span>
                      </div>
                      <Select
                        value={row.itemId}
                        onValueChange={(v) => updateIngredientRow(row.id, "itemId", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                      <label className="text-[10px] font-medium text-neutral-400 block mb-0.5">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="1"
                        value={row.quantity || ""}
                        onChange={(e) =>
                          updateIngredientRow(row.id, "quantity", Number(e.target.value))
                        }
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="w-full sm:w-32">
                      <label className="text-[10px] font-medium text-neutral-400 block mb-0.5">
                        Unit
                      </label>
                      <Select
                        value={row.unit}
                        onValueChange={(v) => updateIngredientRow(row.id, "unit", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
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

                    <div className="flex items-end justify-end pt-2 sm:pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveIngredient(row.id)}
                        className="h-8 w-8 text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium">Notes (Optional)</label>
            <Input
              placeholder="e.g. Made Dal Tadka & Jeera Rice for 4 people"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="h-8 text-xs"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-neutral-100 p-4 dark:border-neutral-800">
          <Link href="/consumption">
            <Button variant="ghost" size="sm" className="text-xs">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
          </Link>
          <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs font-medium">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Commit Cooking Log
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

