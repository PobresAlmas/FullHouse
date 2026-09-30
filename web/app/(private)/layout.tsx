import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function PrivateLayout({
    children
}: {
    children: React.ReactNode
}) {

    return (
        <ProtectedRoute>
            {children}
        </ProtectedRoute>
    );
}