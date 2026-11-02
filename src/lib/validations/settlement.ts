import { z } from "zod";

export const settlementSchema = z.object({
  fromMemberId: z.string().uuid("Please select the debtor"),
  toMemberId: z.string().uuid("Please select the creditor"),
  amount: z.number().min(0.01, "Settlement amount must be greater than zero"),
  settlementDate: z.string().min(1, "Please select settlement date"),
  paymentMethod: z.enum(["UPI", "CASH", "BANK_TRANSFER", "OTHER"]),
  transactionReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine((data) => data.fromMemberId !== data.toMemberId, {
  message: "Debtor and creditor cannot be the same member",
  path: ["toMemberId"],
});

export const shoppingItemSchema = z.object({
  itemId: z.string().uuid().optional().nullable(),
  customItemName: z.string().optional().nullable(),
  quantity: z.number().min(0.01, "Quantity must be greater than zero"),
  unit: z.string().min(1, "Please specify unit"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assignedTo: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine((data) => Boolean(data.itemId || data.customItemName?.trim()), {
  message: "Either select an existing item or provide a custom item name",
  path: ["customItemName"],
});

export type SettlementInput = z.infer<typeof settlementSchema>;
export type ShoppingItemInput = z.infer<typeof shoppingItemSchema>;
