import { z } from "zod";

export const expenseSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters"),
  category: z.enum([
    "Electricity",
    "Water",
    "Gas",
    "Wifi",
    "Rent",
    "Maid",
    "Repairs",
    "Cleaning",
    "Other",
  ]),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  paidBy: z.string().uuid("Please select who paid"),
  paymentSource: z.enum(["PERSONAL", "COMMON_FUND"]),
  expenseDate: z.string().min(1, "Please select an expense date"),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const contributionSchema = z.object({
  memberId: z.string().uuid("Please select a member"),
  periodMonth: z.string().min(1, "Please select the contribution month"),
  amount: z.number().min(1, "Amount must be greater than zero"),
  paymentDate: z.string().min(1, "Please select payment date"),
  paymentMethod: z.enum(["UPI", "CASH", "BANK_TRANSFER", "OTHER"]),
  referenceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ContributionInput = z.infer<typeof contributionSchema>;
