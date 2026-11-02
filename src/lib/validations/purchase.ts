import { z } from "zod";

export const purchaseItemSchema = z.object({
  itemId: z.string().uuid("Please select an item"),
  quantity: z.number().min(0.001, "Quantity must be greater than zero"),
  unit: z.string().min(1, "Please select a unit"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  totalPrice: z.number().min(0, "Total price cannot be negative"),
});

export const purchaseSchema = z.object({
  purchaseDate: z.string().min(1, "Please select a purchase date"),
  shopName: z.string().min(2, "Shop name must be at least 2 characters"),
  purchasedBy: z.string().uuid("Please select who purchased this"),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  tax: z.number().min(0, "Tax cannot be negative").default(0),
  totalAmount: z.number().min(0.01, "Total amount must be greater than zero"),
  paymentSource: z.enum(["PERSONAL", "COMMON_FUND"]),
  paymentMethod: z.enum(["UPI", "CASH", "CARD", "NET_BANKING", "OTHER"]),
  notes: z.string().optional().nullable(),
  billFilePath: z.string().optional().nullable(),
  billFileName: z.string().optional().nullable(),
  billFileSize: z.number().optional().nullable(),
  billFileMime: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, "At least one item must be added to the purchase"),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
