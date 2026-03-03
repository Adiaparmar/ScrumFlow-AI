'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Navigation';

// Routes that should render without the sidebar/app-shell
const AUTH_ROUTES = ['/'];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    if (isAuthRoute) {
        // Auth pages: full-screen, no sidebar, no header
        return <>{children}</>;
    }

    return (
        <div className="app-shell">
            <Sidebar />
            <div className="main-content">
                {children}
            </div>
        </div>
    );
}
