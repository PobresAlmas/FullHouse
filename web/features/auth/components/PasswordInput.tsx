"use client"

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputErrorClass } from "@/lib/inputErrorClass";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    error?: string;
}

export default function PasswordInput({
    id,
    error,
    ...props
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <Input
                {...props}
                id={id}
                type={showPassword ? "text" : "password"}
                placeholder="•••••••••••"
                className={cn(
                    "rounded-sm",
                    inputErrorClass(error)
                )}
            />

            <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
            >
                {
                    showPassword ? <EyeOff size={18}/> : <Eye size={18} />
                }
            </button>
        </div>
    )
}