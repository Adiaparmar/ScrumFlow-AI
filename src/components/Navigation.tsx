'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Calendar, MessageSquare, Volume2, ListTodo, GitBranch,
    Zap, TrendingUp, Sparkles, Bell, Settings, Search,
} from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
}

const NAV: { label: string; items: NavItem[] }[] = [
    {
        label: 'Overview',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Meeting Intelligence',
        items: [
            { href: '/meeting/calendar', label: 'Upcoming Calendar', icon: Calendar },
            { href: '/meeting/importance', label: 'Meeting Importance', icon: MessageSquare },
            { href: '/meeting/speaker', label: 'Speaker Metrics', icon: Volume2 },
            { href: '/meeting/silence', label: 'Silence Metrics', icon: Volume2 },
        ],
    },
    {
        label: 'Task Intelligence',
        items: [
            { href: '/task/overview', label: 'Task Overview', icon: ListTodo },
            { href: '/task/graph', label: 'Dependency Graph', icon: GitBranch },
        ],
    },
    {
        label: 'Allocation Engine',
        items: [
            { href: '/allocation', label: 'Allocation Engine', icon: Zap, badge: '3' },
        ],
    },
    {
        label: 'Analytics',
        items: [
            { href: '/learning', label: 'Learning & Adaptation', icon: TrendingUp },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Sparkles size={16} color="white" />
                </div>
                <div>
                    <div className="sidebar-logo-text">ScrumFlow</div>
                    <div className="sidebar-logo-badge">.ai</div>
                </div>
            </div>

            {NAV.map((section) => (
                <div className="sidebar-section" key={section.label}>
                    <div className="sidebar-section-label">{section.label}</div>
                    {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-item ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={15} className="sidebar-item-icon" />
                                <span>{item.label}</span>
                                {item.badge && (
                                    <span className="sidebar-item-badge">{item.badge}</span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            ))}

            <div style={{ flex: 1 }} />
            <div className="sidebar-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div className="sidebar-item">
                    <Settings size={15} className="sidebar-item-icon" />
                    <span>Settings</span>
                </div>
            </div>
        </aside>
    );
}

export function TopHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <header className="top-header">
            <div>
                <span className="header-title">{title}</span>
                {subtitle && <span className="header-subtitle">/ {subtitle}</span>}
            </div>
            <div className="header-spacer" />
            <div className="header-actions">
                <button className="btn btn-ghost btn-icon" aria-label="Search">
                    <Search size={16} />
                </button>
                <button className="btn btn-ghost btn-icon" aria-label="Notifications">
                    <Bell size={16} />
                </button>
                <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer',
                }}>A</div>
            </div>
        </header>
    );
}
