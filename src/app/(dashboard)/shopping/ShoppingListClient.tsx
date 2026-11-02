"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingListItem,
  Item,
  Member,
  PriorityLevel,
  ShoppingItemStatus,
} from "@/types/database";
import {
  addShoppingListItemAction,
  updateShoppingListItemStatusAction,
  deleteShoppingListItemAction,
  autoPopulateLowStockItemsAction,
} from "@/server/actions/shopping";
import { SUPPORTED_UNITS } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ListTodo,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  XCircle,
  Trash2,
  ShoppingCart,
  Loader2,
  User,
  AlertCircle,
} from "lucide-react";

interface Props {
  shoppingItems: ShoppingListItem[];
  catalogItems: Item[];
  members: Member[];
}

export function ShoppingListClient({
  shoppingItems,
  catalogItems,
  members,
}: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAutoPopulating, setIsAutoPopulating] = React.useState(false);

  // Form states
  const [selectedItemId, setSelectedItemId] = React.useState<string>("custom");
  const [customItemName, setCustomItemName] = React.useState("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [unit, setUnit] = React.useState("pcs");
  const [priority, setPriority] = React.useState<PriorityLevel>("MEDIUM");
  const [assignedTo, setAssignedTo] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const filteredItems = shoppingItems.filter((item) => {
    if (statusFilter === "ALL") return true;
    return item.status === statusFilter;
  });

  const pendingCount = shoppingItems.filter((i) => i.status === "PENDING").length;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemId === "custom" && !customItemName.trim()) {
      toast.error("Please enter a custom item name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addShoppingListItemAction({
        itemId: selectedItemId === "custom" ? null : selectedItemId,
        customItemName: selectedItemId === "custom" ? customItemName.trim() : null,
        quantity: Number(quantity) || 1,
        unit,
        priority,
        assignedTo: assignedTo || null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to add item to list");
        return;
      }

      toast.success("Added to shopping list");
      setAddOpen(false);
      setCustomItemName("");
      setNotes("");
    } catch {
      toast.error("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: ShoppingListItem) => {
    const nextStatus: ShoppingItemStatus =
      item.status === "PENDING" ? "PURCHASED" : "PENDING";

    try {
      await updateShoppingListItemStatusAction(item.id, nextStatus);
      toast.success(
        nextStatus === "PURCHASED"
          ? "Marked as purchased!"
          : "Marked as pending"
      );
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteShoppingListItemAction(id);
      toast.success("Removed from shopping list");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleAutoPopulate = async () => {
    setIsAutoPopulating(true);
    try {
      const res = await autoPopulateLowStockItemsAction();
      if (!res.success) {
        toast.error(res.error || "Failed to auto-suggest items");
        return;
      }
      const count = (res.data as { addedCount: number })?.addedCount || 0;
      if (count === 0) {
        toast.info("No new low-stock items detected.");
      } else {
        toast.success(`Added ${count} low-stock items to your shopping list!`);
      }
    } catch {
      toast.error("Failed to auto-suggest low-stock items");
    } finally {
      setIsAutoPopulating(false);
    }
  };

  const getPriorityBadge = (p: PriorityLevel) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="destructive" className="text-[10px] py-0">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="text-[10px] py-0">High</Badge>;
      case "LOW":
        return <Badge variant="secondary" className="text-[10px] py-0">Low</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] py-0">Medium</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Shared Shopping List
          </h1>
          <p className="text-xs text-neutral-500">
            Collaborative grocery list with automated low-stock suggestions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoPopulate}
            disabled={isAutoPopulating}
            className="text-xs h-8"
          >
            {isAutoPopulating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            )}
            Auto-Suggest Low Stock
          </Button>

          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="text-xs h-8"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add to List
          </Button>
        </div>
      </div>

      {/* Filter and Convert CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs border-neutral-200 dark:border-neutral-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Items</SelectItem>
              <SelectItem value="PENDING">Pending ({pendingCount})</SelectItem>
              <SelectItem value="PURCHASED">Purchased</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {pendingCount > 0 && (
          <Link href="/purchases/new">
            <Button variant="secondary" size="sm" className="text-xs h-8">
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Convert to Purchase
            </Button>
          </Link>
        )}
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-neutral-200 dark:border-neutral-800">
          <ListTodo className="mx-auto h-10 w-10 text-neutral-400" />
          <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Your shopping list is clear
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Click &quot;Auto-Suggest Low Stock&quot; or add grocery items manually.
          </p>
        </Card>
      ) : (
        <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800 overflow-hidden">
          <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredItems.map((item) => {
              const isPurchased = item.status === "PURCHASED";
              const itemName = item.item?.name || item.custom_item_name || "Item";

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors ${
                    isPurchased ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                      title={isPurchased ? "Mark as pending" : "Mark as purchased"}
                    >
                      {isPurchased ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-semibold ${
                            isPurchased
                              ? "line-through text-neutral-400"
                              : "text-neutral-900 dark:text-neutral-100"
                          }`}
                        >
                          {itemName}
                        </span>
                        <span className="text-xs font-medium text-neutral-500">
                          {item.quantity} {item.unit}
                        </span>
                        {getPriorityBadge(item.priority)}
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-neutral-400 mt-0.5">
                        {item.assignee && (
                          <span className="flex items-center">
                            <User className="mr-1 h-3 w-3" /> Assigned:{" "}
                            {item.assignee.profile?.full_name}
                          </span>
                        )}
                        {item.notes && <span className="italic">&quot;{item.notes}&quot;</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      className="h-8 w-8 text-neutral-400 hover:text-red-600"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Add Shopping Item Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Add to Shopping List</DialogTitle>
            <DialogDescription className="text-xs">
              Select an item from your catalog or enter a custom grocery request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Catalog Item</label>
              <Select
                value={selectedItemId}
                onValueChange={(v) => {
                  setSelectedItemId(v);
                  if (v !== "custom") {
                    const sel = catalogItems.find((i) => i.id === v);
                    if (sel) setUnit(sel.base_unit);
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">+ Custom / Ad-hoc Item</SelectItem>
                  {catalogItems.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.category?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedItemId === "custom" && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Custom Item Name</label>
                <Input
                  placeholder="e.g. Potato chips, Dish soap, Ice cream"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Quantity</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="1"
                  value={quantity || ""}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Unit</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="text-xs">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Priority</label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as PriorityLevel)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent (Out of Stock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Assign To (Optional)</label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Anyone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Anyone</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.profile?.full_name || "Member"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Notes (Optional)</label>
              <Input
                placeholder="e.g. Buy the big family pack if available"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full text-xs mt-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add to Shopping List"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
