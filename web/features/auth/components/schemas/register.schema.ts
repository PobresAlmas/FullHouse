import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),

    nickname: z.string(),

    email: z.email({
        error: "Digite um email válido",
    }),

    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
