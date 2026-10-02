import FieldMessage from "@/components/form/FieldMessage";
import { Label } from "@/components/ui/label";
import React from "react";

interface FormFieldProps {
    id: string;
    label: string;
    children: React.ReactNode;
    helperText?: string;
    error?: string;
}

export default function FormField({ id, label, children, helperText, error }: FormFieldProps) {
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {<FieldMessage error={error} helperText={helperText} />}
        </div>
    );
}
