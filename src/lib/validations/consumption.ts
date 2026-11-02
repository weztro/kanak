import { z } from "zod";

export const consumptionItemSchema = z.object({
  itemId: z.string().uuid("Please select an item"),
  quantity: z.number().min(0.001, "Quantity must be greater than zero"),
  unit: z.string().min(1, "Please select a unit"),
});

export const consumptionSchema = z.object({
  consumptionDate: z.string().min(1, "Please select a date"),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snacks", "Other"]),
  recordedBy: z.string().uuid("Please select who recorded this"),
  notes: z.string().optional().nullable(),
  items: z.array(consumptionItemSchema).min(1, "At least one ingredient must be specified"),
});

export type ConsumptionItemInput = z.infer<typeof consumptionItemSchema>;
export type ConsumptionInput = z.infer<typeof consumptionSchema>;
