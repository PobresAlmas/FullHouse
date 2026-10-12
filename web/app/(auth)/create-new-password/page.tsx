import { Suspense } from "react";
import CreateNewPasswordForm from "@/features/auth/components/CreateNewPasswordForm";

export default function CreateNewPasswordPage() {
    return (
        <Suspense fallback={null}>
            <CreateNewPasswordForm />
        </Suspense>
    );
}
