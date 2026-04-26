import { z } from "zod";

// Min 12 chars per ADR 002. Length > entropy; no other complexity rules.
export const SignUpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(12, "password must be at least 12 characters").max(256),
});

export type SignUpDto = z.infer<typeof SignUpSchema>;
