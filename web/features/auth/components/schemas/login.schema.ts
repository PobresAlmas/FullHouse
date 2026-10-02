import { z } from "zod";

export const loginSchema = z.object({
    email: z.email({
        error: "Digite um email válido",
    }),
    password: z.string().min(8, {
        error: "A senha deve ter pelo menos 8 caracteres.",
    }),
    rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
