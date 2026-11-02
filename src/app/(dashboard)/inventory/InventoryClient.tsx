"use client";

import * as React from "react";
import Link from "next/link";
import { Item, Category, StockTransaction } from "@/types/database";
import { createItemAction, recordStockAdjustmentAction, getItemStockHistory } from "@/server/actions/inventory";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatFriendlyStock, SUPPORTED_UNITS } from "@/lib/units";
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
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Loader2,
  Trash2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface Props {
  items: Item[];
  categories: Category[];
}

export function InventoryClient({ items, categories }: Props) {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");
  const [selectedStockStatus, setSelectedStockStatus] = React.useState("ALL");

  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
  const [historyTransactions, setHistoryTransactions] = React.useState<StockTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  // Form states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState("");
  const [newItemCategory, setNewItemCategory] = React.useState("");
  const [newItemBaseUnit, setNewItemBaseUnit] = React.useState<string>("pcs");
  const [newItemMinStock, setNewItemMinStock] = React.useState<number>(0);
  const [newItemDescription, setNewItemDescription] = React.useState("");

  // Adjustment form states
  const [adjustType, setAdjustType] = React.useState<"ADJUSTMENT" | "WASTAGE">("WASTAGE");
  const [adjustQty, setAdjustQty] = React.useState<number>(0);
  const [adjustUnit, setAdjustUnit] = React.useState("pcs");
  const [adjustReason, setAdjustReason] = React.useState("");

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || item.category_id === selectedCategory;

    const currentStock = item.inventory?.current_stock || 0;
    const minStock = item.minimum_stock || 0;

    let status = "IN_STOCK";
    if (currentStock <= 0) status = "OUT_OF_STOCK";
    else if (currentStock <= minStock) status = "LOW_STOCK";

    const matchesStatus =
      selectedStockStatus === "ALL" ||
      (selectedStockStatus === "IN_STOCK" && status === "IN_STOCK") ||
      (selectedStockStatus === "LOW_STOCK" && status === "LOW_STOCK") ||
      (selectedStockStatus === "OUT_OF_STOCK" && status === "OUT_OF_STOCK");

    return matchesSearch && matchesCat && matchesStatus;
  });

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCategory) {
      toast.error("Please provide an item name and category");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createItemAction({
        name: newItemName.trim(),
        categoryId: newItemCategory,
        baseUnit: newItemBaseUnit,
        minimumStock: Number(newItemMinStock),
        description: newItemDescription.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to create item");
        return;
      }
      toast.success("Item added to catalog");
      setCreateOpen(false);
      setNewItemName("");
      setNewItemDescription("");
    } catch {
      toast.error("Failed to create item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || adjustQty <= 0 || !adjustReason.trim()) {
      toast.error("Please enter a valid quantity and reason");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await recordStockAdjustmentAction({
        itemId: selectedItem.id,
        adjustmentType: adjustType,
        quantity: Number(adjustQty),
        unit: adjustUnit,
        reason: adjustReason.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Failed to adjust stock");
        return;
      }
      toast.success(adjustType === "WASTAGE" ? "Wastage recorded" : "Stock adjusted");
      setAdjustOpen(false);
      setAdjustQty(0);
      setAdjustReason("");
    } catch {
      toast.error("Failed to record adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openHistory = async (item: Item) => {
    setSelectedItem(item);
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const history = await getItemStockHistory(item.id);
      setHistoryTransactions(history);
    } catch {
      toast.error("Failed to load stock history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const openAdjustment = (item: Item, type: "ADJUSTMENT" | "WASTAGE") => {
    setSelectedItem(item);
    setAdjustType(type);
    setAdjustUnit(item.base_unit);
    setAdjustOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Inventory & Pantry
          </h1>
          <p className="text-xs text-neutral-500">
            Track current stock levels, unit prices, and consumption audit trails.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/inventory/opening">
            <Button variant="outline" size="sm" className="text-xs h-8">
              <History className="mr-1.5 h-3.5 w-3.5" /> Opening Stock Setup
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => {
              if (categories.length > 0) setNewItemCategory(categories[0].id);
              setCreateOpen(true);
            }}
            className="text-xs h-8"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Item
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Search items by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <div className="flex space-x-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-36 sm:w-44 h-8 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStockStatus} onValueChange={setSelectedStockStatus}>
                <SelectTrigger className="w-32 sm:w-36 h-8 text-xs">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="IN_STOCK">In Stock</SelectItem>
                  <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List / Grid */}
      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            No items found
          </h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            {search || selectedCategory !== "ALL" || selectedStockStatus !== "ALL"
              ? "Try adjusting your search query or filters to find items."
              : "Start by creating items or setting up opening stock for your bachelor pad."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((item) => {
            const currentStock = item.inventory?.current_stock || 0;
            const minStock = item.minimum_stock || 0;
            const avgPrice = item.inventory?.average_purchase_price || 0;

            let badgeVariant: "success" | "warning" | "destructive" = "success";
            let statusLabel = "In Stock";

            if (currentStock <= 0) {
              badgeVariant = "destructive";
              statusLabel = "Out of Stock";
            } else if (currentStock <= minStock) {
              badgeVariant = "warning";
              statusLabel = "Low Stock";
            }

            return (
              <Card
                key={item.id}
                className="border-neutral-200/80 shadow-xs hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                        {item.category?.name || "General"}
                      </span>
                      <CardTitle className="text-sm font-semibold mt-0.5">
                        {item.name}
                      </CardTitle>
                    </div>
                    <Badge variant={badgeVariant} className="text-[10px] py-0">
                      {statusLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-2 text-xs dark:bg-neutral-800/40">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Current Stock</span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatFriendlyStock(currentStock, item.base_unit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Min Threshold</span>
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">
                        {formatFriendlyStock(minStock, item.base_unit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Avg Price</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatCurrency(avgPrice)} / {item.base_unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Last Purchased</span>
                      <span className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                        {item.inventory?.last_purchased_at
                          ? formatDate(item.inventory.last_purchased_at)
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openHistory(item)}
                      className="h-7 px-2 text-[11px] text-neutral-500 hover:text-neutral-900"
                    >
                      <History className="mr-1 h-3 w-3" /> Audit Trail
                    </Button>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAdjustment(item, "WASTAGE")}
                        className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Record Wastage"
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Wastage
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAdjustment(item, "ADJUSTMENT")}
                        className="h-7 px-2 text-[11px] text-neutral-600 hover:text-neutral-900"
                        title="Adjust Stock"
                      >
                        <SlidersHorizontal className="mr-1 h-3 w-3" /> Adjust
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Item Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Add Item to Catalog</DialogTitle>
            <DialogDescription className="text-xs">
              Define the item master name, category, and normalized base unit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Item Name</label>
              <Input
                placeholder="e.g. Basmati Rice, Amul Milk 1L, Toor Dal"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Category</label>
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Base Unit</label>
                <Select value={newItemBaseUnit} onValueChange={setNewItemBaseUnit}>
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

              <div className="space-y-1">
                <label className="text-xs font-medium">Min Threshold</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newItemMinStock}
                  onChange={(e) => setNewItemMinStock(Number(e.target.value))}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Description (Optional)</label>
              <Input
                placeholder="Preferred brand, packing details..."
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full text-xs mt-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment / Wastage Modal */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">
              {adjustType === "WASTAGE" ? "Record Item Wastage" : "Adjust Inventory Count"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {adjustType === "WASTAGE"
                ? `Record spoiled or discarded ${selectedItem?.name}. Stock will be reduced.`
                : `Correct physical inventory for ${selectedItem?.name}. Creates an immutable audit record.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Quantity</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="1"
                  value={adjustQty || ""}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Unit</label>
                <Select value={adjustUnit} onValueChange={setAdjustUnit}>
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

            <div className="space-y-1">
              <label className="text-xs font-medium">Reason</label>
              <Input
                placeholder={
                  adjustType === "WASTAGE"
                    ? "e.g. Spoiled in fridge, expired, burned while cooking"
                    : "e.g. Physical count discrepancy after weekend clean"
                }
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              variant={adjustType === "WASTAGE" ? "destructive" : "default"}
              disabled={isSubmitting}
              className="w-full text-xs mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : adjustType === "WASTAGE" ? (
                "Confirm Wastage"
              ) : (
                "Update Stock"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Transaction History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Stock Movement Audit: {selectedItem?.name}</span>
              <span className="text-xs font-normal text-neutral-400">
                Base Unit: {selectedItem?.base_unit}
              </span>
            </DialogTitle>
          </DialogHeader>

          {loadingHistory ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : historyTransactions.length === 0 ? (
            <p className="p-6 text-center text-xs text-neutral-400">
              No transactions recorded for this item yet.
            </p>
          ) : (
            <div className="space-y-2 pt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
              {historyTransactions.map((tx) => {
                const isPositive = tx.quantity_normalized > 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            tx.transaction_type === "PURCHASE" || tx.transaction_type === "OPENING"
                              ? "success"
                              : tx.transaction_type === "WASTAGE"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] py-0"
                        >
                          {tx.transaction_type}
                        </Badge>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {tx.reason || "Inventory Movement"}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 mt-0.5 block">
                        {formatDate(tx.created_at)} • Logged by {tx.recorder?.full_name || "Member"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-semibold block ${
                          isPositive ? "text-emerald-600" : "text-neutral-800 dark:text-neutral-200"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {tx.quantity} {tx.unit}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {tx.stock_before} → {tx.stock_after} {selectedItem?.base_unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

