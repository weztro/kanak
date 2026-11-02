"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Item, Member, PaymentSource, PaymentMethod } from "@/types/database";
import { createPurchaseAction } from "@/server/actions/purchases";
import { SUPPORTED_UNITS } from "@/lib/units";
import { formatCurrency } from "@/lib/utils";
import { validateFileSignature } from "@/lib/security/file-signature";
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
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Upload,
  FileCheck,
  Check,
  DollarSign,
} from "lucide-react";

interface FormItemRow {
  id: string;
  itemId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface Props {
  items: Item[];
  members: Member[];
}

export function NewPurchaseForm({ items, members }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form fields
  const [purchaseDate, setPurchaseDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [shopName, setShopName] = React.useState("");
  const [purchasedBy, setPurchasedBy] = React.useState(members[0]?.id || "");
  const [paymentSource, setPaymentSource] = React.useState<PaymentSource>("PERSONAL");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("UPI");
  const [notes, setNotes] = React.useState("");

  // Bill file
  const [billFile, setBillFile] = React.useState<File | null>(null);
  const [fileValidationStatus, setFileValidationStatus] = React.useState<string | null>(null);

  // Items rows
  const [itemRows, setItemRows] = React.useState<FormItemRow[]>(() => {
    if (items.length > 0) {
      return [
        {
          id: `item-${Date.now()}`,
          itemId: items[0].id,
          quantity: 1,
          unit: items[0].base_unit,
          unitPrice: 0,
          totalPrice: 0,
        },
      ];
    }
    return [];
  });

  const [discount, setDiscount] = React.useState<number>(0);
  const [tax, setTax] = React.useState<number>(0);

  // Calculations
  const subtotal = itemRows.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  const totalAmount = Math.max(0, subtotal - (discount || 0) + (tax || 0));

  const handleAddItemRow = () => {
    if (items.length === 0) {
      toast.error("No items in catalog. Please create items first.");
      return;
    }
    setItemRows((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        itemId: items[0].id,
        quantity: 1,
        unit: items[0].base_unit,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (itemRows.length <= 1) {
      toast.error("At least one purchase item is required");
      return;
    }
    setItemRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateItemRow = (id: string, field: keyof FormItemRow, val: unknown) => {
    setItemRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };

        if (field === "itemId") {
          const selected = items.find((i) => i.id === val);
          if (selected) {
            updated.unit = selected.base_unit;
            updated.unitPrice = selected.inventory?.average_purchase_price || r.unitPrice;
            updated.totalPrice = Number((r.quantity * updated.unitPrice).toFixed(2));
          }
        } else if (field === "quantity" || field === "unitPrice") {
          const q = field === "quantity" ? Number(val) : r.quantity;
          const p = field === "unitPrice" ? Number(val) : r.unitPrice;
          updated.totalPrice = Number((q * p).toFixed(2));
        }

        return updated;
      })
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setBillFile(null);
      setFileValidationStatus(null);
      return;
    }

    const validation = await validateFileSignature(file);
    if (!validation.isValid) {
      toast.error(validation.error || "Invalid file format");
      e.target.value = "";
      setBillFile(null);
      setFileValidationStatus(null);
      return;
    }

    setBillFile(file);
    setFileValidationStatus(`Valid ${validation.detectedMime} (${(file.size / 1024).toFixed(1)} KB)`);
    toast.success("Receipt verified successfully");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error("Please enter shop / store name");
      return;
    }
    if (!purchasedBy) {
      toast.error("Please select who purchased this");
      return;
    }
    if (itemRows.length === 0 || totalAmount <= 0) {
      toast.error("Please add items with valid quantities and prices");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        purchaseDate,
        shopName: shopName.trim(),
        purchasedBy,
        subtotal,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        totalAmount,
        paymentSource,
        paymentMethod,
        notes: notes.trim() || null,
        items: itemRows.map((r) => ({
          itemId: r.itemId,
          quantity: Number(r.quantity),
          unit: r.unit,
          unitPrice: Number(r.unitPrice),
          totalPrice: Number(r.totalPrice),
        })),
      };

      const formData = new FormData();
      if (billFile) {
        formData.append("billFile", billFile);
      }

      const res = await createPurchaseAction(payload, billFile ? formData : null);
      if (!res.success) {
        toast.error(res.error || "Failed to post purchase");
        setIsSubmitting(false);
        return;
      }

      toast.success("Grocery purchase posted and allocated equally!");
      router.push("/purchases");
      router.refresh();
    } catch {
      toast.error("Failed to post purchase");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
      <form onSubmit={handleSubmit}>
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <CardTitle className="text-sm font-semibold">Purchase Details</CardTitle>
          <CardDescription className="text-xs">
            Enter store receipt information and payment source.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Header Row: Date, Shop, Buyer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Purchase Date</label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Shop / Supermarket</label>
              <Input
                placeholder="e.g. DMart, Zepto, Local Kirana"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Purchased By</label>
              <Select value={purchasedBy} onValueChange={setPurchasedBy}>
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

          {/* Payment Source & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
            <div className="space-y-1">
              <label className="text-xs font-medium">Payment Source</label>
              <Select
                value={paymentSource}
                onValueChange={(v) => setPaymentSource(v as PaymentSource)}
              >
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-neutral-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">
                    Personal Money (Recorded as Member Advance)
                  </SelectItem>
                  <SelectItem value="COMMON_FUND">
                    Common Fund (Deducted from shared balance)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Payment Method</label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-neutral-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI (GPay / PhonePe / Paytm)</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                  <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Itemized Cart */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Purchased Items ({itemRows.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItemRow}
                className="h-7 text-[11px]"
              >
                <Plus className="mr-1 h-3 w-3" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {itemRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-neutral-400 block mb-0.5">
                      Item
                    </label>
                    <Select
                      value={row.itemId}
                      onValueChange={(v) => updateItemRow(row.id, "itemId", v)}
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

                  <div className="w-full sm:w-24">
                    <label className="text-[10px] font-medium text-neutral-400 block mb-0.5">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="1"
                      value={row.quantity || ""}
                      onChange={(e) => updateItemRow(row.id, "quantity", Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="text-[10px] font-medium text-neutral-400 block mb-0.5">
                      Unit
                    </label>
                    <Select
                      value={row.unit}
                      onValueChange={(v) => updateItemRow(row.id, "unit", v)}
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

                  <div className="w-full sm:w-24">
                    <label className="text-[10px] font-medium text-neutral-400 block mb-0.5">
                      Unit Price (₹)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={row.unitPrice || ""}
                      onChange={(e) => updateItemRow(row.id, "unitPrice", Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="text-[10px] font-medium text-neutral-400 block mb-0.5">
                      Total (₹)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      value={row.totalPrice || ""}
                      onChange={(e) => updateItemRow(row.id, "totalPrice", Number(e.target.value))}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>

                  <div className="flex items-end justify-end pt-2 sm:pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItemRow(row.id)}
                      className="h-8 w-8 text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals: Subtotal, Discount, Tax, Final Amount */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-500">Discount (₹)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="h-8 w-28 text-xs bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-500">Tax / Delivery (₹)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={tax || ""}
                  onChange={(e) => setTax(Number(e.target.value))}
                  className="h-8 w-28 text-xs bg-white dark:bg-neutral-900"
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-neutral-400 block">Total Payable</span>
              <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(totalAmount)}
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                Subtotal: {formatCurrency(subtotal)}
              </span>
            </div>
          </div>

          {/* Bill Attachment & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Receipt / Bill Attachment</label>
              <div className="flex flex-col space-y-1.5">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="h-9 text-xs file:mr-2 file:h-7 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2.5 file:text-xs file:font-medium dark:file:bg-neutral-800"
                />
                {fileValidationStatus ? (
                  <span className="text-[11px] text-emerald-600 flex items-center">
                    <FileCheck className="mr-1 h-3 w-3" /> {fileValidationStatus}
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400">
                    Max 5 MB. Formats: JPEG, PNG, WebP, PDF. Validated magic bytes.
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Notes (Optional)</label>
              <Input
                placeholder="e.g. Weekly grocery run, bought extra eggs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-neutral-100 p-4 dark:border-neutral-800">
          <Link href="/purchases">
            <Button variant="ghost" size="sm" className="text-xs">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
          </Link>
          <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs font-medium">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Post Purchase
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

