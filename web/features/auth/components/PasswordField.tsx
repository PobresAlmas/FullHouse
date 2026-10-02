import FormField from "./FormField";
import PasswordInput from "./PasswordInput";

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    helperText?: string;
    error?: string;
}

export default function PasswordField({
    id,
    label,
    helperText,
    error,
    ...props
}: PasswordFieldProps) {
    return (
        <FormField id={id} label={label} helperText={helperText} error={error}>
            <PasswordInput id={id} error={error} {...props} />
        </FormField>
    );
}
