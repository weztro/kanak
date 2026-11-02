import { z } from "zod";

export const createAccommodationSchema = z.object({
  name: z.string().min(3, "Accommodation name must be at least 3 characters"),
  monthlyBudget: z.number().min(0, "Monthly budget must be 0 or greater"),
  defaultMonthlyContribution: z.number().min(0, "Default contribution must be 0 or greater"),
  currency: z.string(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "member"]),
});

export type CreateAccommodationInput = z.infer<typeof createAccommodationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
