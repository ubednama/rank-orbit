import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "password required"),
});

export type LoginDto = z.infer<typeof LoginSchema>;
