interface FieldMessageProps {
    error?: string;
    helperText?: string;
}

export default function FieldMessage({
    error,
    helperText
}: FieldMessageProps) {
    if (error) {
        return (
            <p className="text-sm text-red-500 text-right">
                {error}
            </p>
        );
    }

    if (helperText) {
        return (
            <p className="text-sm text-gray">
                {helperText}
            </p>
        );
    }

    return null;
}