import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character.");

export const authSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(80).optional(),
});

export type AuthFormData = z.infer<typeof authSchema>;

export function calculatePasswordStrength(password: string): "Weak" | "Fair" | "Strong" {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score < 2) return "Weak";
  if (score < 4) return "Fair";
  return "Strong";
}
