import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Organisation Login – ScrumFlow.ai',
    description: 'Sign in or register your organisation to access the AAES execution dashboard.',
};

export default function OrgLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
