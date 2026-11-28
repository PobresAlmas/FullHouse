import Link from "next/link";
import type { ReactNode } from "react";

export function NotificationCardContent({
    href,
    title,
    onOpen,
    className,
    children,
}: {
    href?: string;
    title: string;
    onOpen: () => void;
    className: string;
    children: ReactNode;
}) {
    if (!href) return <div className={className}>{children}</div>;

    return (
        <Link
            href={href}
            aria-label={title}
            onClick={onOpen}
            className={`notification-card-link ${className}`}
        >
            {children}
        </Link>
    );
}
