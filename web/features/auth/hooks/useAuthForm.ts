import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldValues, useForm, type UseFormProps } from "react-hook-form";
import z from "zod";

export function useAuthForm<T extends FieldValues>(
    schema: z.ZodType<T, T>,
    options?: Omit<UseFormProps<T>, "resolver">
) {
    return useForm<T>({
        resolver: zodResolver(schema),
        ...options
    });
}