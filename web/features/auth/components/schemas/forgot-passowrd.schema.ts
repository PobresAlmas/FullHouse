import { z } from "zod";

export const forgotPasswordSchema = z.object({
    email: z.email("Digite um email válido")
});


export type ForgotPasswordFormData =
    z.infer<typeof forgotPasswordSchema>;