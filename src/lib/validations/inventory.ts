import { z } from "zod";

export const itemSchema = z.object({
  name: z.string().min(2, "Item name must be at least 2 characters"),
  categoryId: z.string().uuid("Please select a category"),
  baseUnit: z.enum(["g", "kg", "ml", "l", "pcs", "pack", "box", "bottle", "roll"]),
  minimumStock: z.number().min(0, "Minimum stock must be 0 or greater"),
  description: z.string().optional().nullable(),
});

export const openingInventoryItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1),
  unitPrice: z.number().min(0).default(0),
});

export const stockAdjustmentSchema = z.object({
  itemId: z.string().uuid(),
  adjustmentType: z.enum(["ADJUSTMENT", "WASTAGE"]),
  quantity: z.number().min(0.001, "Quantity must be greater than zero"),
  unit: z.string().min(1),
  reason: z.string().min(3, "Please provide a reason for the adjustment"),
});

export type ItemInput = z.infer<typeof itemSchema>;
export type OpeningInventoryItemInput = z.infer<typeof openingInventoryItemSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
