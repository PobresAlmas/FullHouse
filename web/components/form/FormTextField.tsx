import TextField from "@/features/auth/components/TextField";
import { FieldValues, Path, UseFormReturn } from "react-hook-form";

interface FormTextFieldProps<T extends FieldValues> {
    name: Path<T>;
    label: string;
    form: UseFormReturn<T>;
    type?: string;
    placeholder?: string;
}

export default function FormTextField<T extends FieldValues>({
    name,
    label,
    placeholder,
    form,
    type = "text"
}: FormTextFieldProps<T>) {
    return (
        <TextField
            id={String(name)}
            label={label}
            placeholder={placeholder}
            {...form.register(name)}
            error={form.formState.errors[name]?.message as string}
        />
    )
}