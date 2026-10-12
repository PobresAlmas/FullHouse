import { Suspense } from "react";
import VerifyEmailForm from "@/features/auth/components/VerifyEmailForm";

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={null}>
            <VerifyEmailForm />
        </Suspense>
    );
}
