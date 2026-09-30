import React from "react";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
    CardContent
} from "@/components/ui/card";

interface AuthCardProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

export default function AuthCard({ title, description, children }: AuthCardProps) {
    return (
        <Card className="w-full max-w-md p-8 gap-6 rounded-sm">
            <CardHeader>
                <CardTitle className="font-bold">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>

            <CardContent>
                {children}
            </CardContent>
        </Card>
    )
}