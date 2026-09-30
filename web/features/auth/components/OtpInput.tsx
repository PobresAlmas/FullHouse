"use client"

import { useRef, useState } from "react";

interface OtpInputProps {
    length: number;
    onChange: (value: string) => void;
}

export default function OtpInput({ length, onChange }: OtpInputProps) {
    const [values, setValues] = useState(Array(length).fill(""));
    
    const inputRefs = useRef<HTMLInputElement[]>([]);

    return (
        <div className="flex gap-4">
            {
                values.map((value, index) => (
                    <input 
                        key={index}
                        className="w-10 h-10 rounded-md border border-border text-center text-lg outline-none focus:ring-2 focus:ring-primary" 
                        type="text" 
                        value={value} 
                        maxLength={1}
                        ref={(el) => {
                            if (el)
                                inputRefs.current[index] = el;
                            }}
                        onChange={(e) => {
                            const value = e.target.value;

                            if(!/^\d?$/.test(value)) return;

                            const copy = [...values];
                            copy[index] = value;
                            setValues(copy);
                            onChange(copy.join(""));

                            if (value)
                                inputRefs.current[index + 1]?.focus();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Backspace") {
                                if (values[index]) {
                                    const copy = [...values];
                                    copy[index] = "";
                                    setValues(copy);
                                    onChange(copy.join(""));
                                } else if (index > 0) {
                                    inputRefs.current[index - 1]?.focus();
                                    const copy = [...values];
                                    copy[index - 1] = "";
                                    setValues(copy);
                                    onChange(copy.join(""));
                                }
                            }
                        }}
                        onPaste={(e) => {
                            e.preventDefault();

                            const pastedValue = e.clipboardData
                                .getData("text")
                                .replace(/\D/g, "")
                                .slice(0, length)

                            if (!pastedValue) return;

                            const newValues = [...values];

                            pastedValue
                                .split("")
                                .forEach((digit, i) => newValues[i] = digit);

                            setValues(newValues);

                            onChange(newValues.join(""));

                            const lastIndex = Math.min(
                                pastedValue.length,
                                length
                            ) - 1;

                            inputRefs.current[lastIndex]?.focus();
                        }}
                    />
                ))
            }
        </div>
    )
}