import FormField from "@/features/auth/components/FormField";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { inputErrorClass } from "@/lib/inputErrorClass";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    type?: string;
    placeholder?: string;
    error?: string;
}

export default function TextField({
    id,
    label,
    type,
    placeholder,
    error,
    ...props
}: TextFieldProps) {
    return (
        <FormField id={id} label={label} error={error}>
            <Input
                id={id}
                type={type}
                placeholder={placeholder}
                required
                className={cn("rounded-sm", inputErrorClass(error))}
                {...props}
            />
        </FormField>
    );
}
