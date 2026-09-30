import React from "react";
import AuthCard from "./AuthCard";

interface AuthFormLayoutProps {
    title: string;
    description: string;
    children: React.ReactNode;
    onSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]>;
    //  onSubmit: React.ComponentProps<"form">["onSubmit"];
}

export default function AuthFormLayout({
    title, 
    description, 
    children, 
    onSubmit 
}: AuthFormLayoutProps) {
    return (
        <AuthCard
            title={title}
            description={description}
        >
            <form  
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit(event);
                }}
                // onSubmit={onSubmit}
            >
                {children}
            </form>
        </AuthCard>
    )
}