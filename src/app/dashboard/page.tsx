'use client';

import {
    DASHBOARD_METRICS, RECENT_ALLOCATIONS, RECENT_MEETINGS_IMPORTANCE, ACCURACY_TREND,
} from '@/lib/mockData';
import { TopHeader } from '@/components/Navigation';
import {
    FolderOpen, CalendarCheck2, Clock3, CheckCheck,
    TrendingUp, ArrowUpRight, ArrowDownRight, Info,
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const METRICS = [
    {
        label: 'Active Projects',
        value: DASHBOARD_METRICS.activeProjects,
        icon: FolderOpen,
        iconBg: '#1e3a5f',
        iconColor: '#3b82f6',
        change: '+1 this month',
        direction: 'up',
    },
    {
        label: 'Upcoming Meetings',
        value: DASHBOARD_METRICS.upcomingMeetings,
        icon: CalendarCheck2,
        iconBg: '#2e1b5f',
        iconColor: '#8b5cf6',
        change: '+3 vs last week',
        direction: 'up',
    },
    {
        label: 'Pending Allocations',
        value: DASHBOARD_METRICS.pendingAllocations,
        icon: Clock3,
        iconBg: '#3d2b0f',
        iconColor: '#f59e0b',
        change: '-4 vs yesterday',
        direction: 'down',
    },
    {
        label: 'Acceptance Rate',
        value: `${DASHBOARD_METRICS.acceptanceRate}%`,
        icon: CheckCheck,
        iconBg: '#0f3323',
        iconColor: '#10b981',
        change: '+2.1% vs last 30d',
        direction: 'up',
    },
];

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip-label">{label}</div>
            {payload.map((p: any) => (
                <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.name}:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{p.value}%</span>
                </div>
            ))}
        </div>
    );
}

const STATUS_COLORS: Record<string, string> = {
    accepted: 'badge-green',
    pending: 'badge-amber',
    overridden: 'badge-violet',
    rejected: 'badge-rose',
};

export default function DashboardPage() {
    const trendData = ACCURACY_TREND.slice(-14);

    return (
        <>
            <TopHeader title="Dashboard" subtitle="Overview" />
            <div className="page-content animate-fade">
                {/* Page Header */}
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Welcome back, Alex 👋</h1>
                        <p>Here's what's happening across your projects today · Feb 20, 2026</p>
                    </div>
                    <div className="page-header-actions">
                        <button className="btn btn-secondary btn-sm">
                            <Info size={13} /> View Report
                        </button>
                        <button className="btn btn-primary btn-sm">
                            <TrendingUp size={13} /> Export
                        </button>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid-4 section-gap">
                    {METRICS.map((m) => {
                        const Icon = m.icon;
                        return (
                            <div className="metric-card" key={m.label}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div
                                        className="metric-icon"
                                        style={{ background: m.iconBg }}
                                    >
                                        <Icon size={17} color={m.iconColor} />
                                    </div>
                                    <div style={{
                                        fontSize: 10, fontWeight: 600, color: m.direction === 'up' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                                        display: 'flex', alignItems: 'center', gap: 3,
                                        background: m.direction === 'up' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                                        padding: '3px 7px', borderRadius: 20,
                                    }}>
                                        {m.direction === 'up' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                        {m.change}
                                    </div>
                                </div>
                                <div className="metric-value">{m.value}</div>
                                <div className="metric-label">{m.label}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Charts Row */}
                <div className="grid-2 section-gap">
                    {/* Model Accuracy Trend */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title"><TrendingUp size={15} /> Model Accuracy Trend</div>
                                <div className="card-subtitle">Last 14 days · Daily accuracy</div>
                            </div>
                            <span className="badge badge-green">+2.1%</span>
                        </div>
                        <div className="chart-container" style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,74,0.5)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={2}
                                    />
                                    <YAxis
                                        domain={[60, 100]}
                                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="accuracy"
                                        name="Accuracy"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#3b82f6' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Override Rate Trend */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title"><TrendingUp size={15} /> Override Rate Trend</div>
                                <div className="card-subtitle">Last 14 days · Daily override rate</div>
                            </div>
                            <span className="badge badge-green">▼ 1.3%</span>
                        </div>
                        <div className="chart-container" style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,74,0.5)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={2}
                                    />
                                    <YAxis
                                        domain={[0, 40]}
                                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="overrideRate"
                                        name="Override Rate"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#f59e0b' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Recent Tables Row */}
                <div className="grid-2 section-gap">
                    {/* Recent Allocation Suggestions */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Recent Allocation Suggestions</div>
                                <div className="card-subtitle">5 most recent · Sorted by latest</div>
                            </div>
                            <button className="btn btn-ghost btn-sm">View All</button>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Task ID</th>
                                    <th>Assignee</th>
                                    <th>Confidence</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RECENT_ALLOCATIONS.map((a) => (
                                    <tr key={a.id}>
                                        <td><span className="mono" style={{ color: 'var(--accent-blue-light)' }}>{a.taskId}</span></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{a.assignee}</td>
                                        <td>
                                            <div className="progress-bar-wrap">
                                                <div className="progress-bar-track" style={{ maxWidth: 60 }}>
                                                    <div
                                                        className="progress-bar-fill"
                                                        style={{
                                                            width: `${a.confidence}%`,
                                                            background: a.confidence > 80 ? 'var(--accent-emerald)' : a.confidence > 60 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                                                        }}
                                                    />
                                                </div>
                                                <span className="progress-value">{a.confidence}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${STATUS_COLORS[a.status] || 'badge-gray'}`}>
                                                {a.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Recent Meeting Importance */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Meeting Importance Scores</div>
                                <div className="card-subtitle">5 most recent · Sorted by score</div>
                            </div>
                            <button className="btn btn-ghost btn-sm">View All</button>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Meeting</th>
                                    <th>Project</th>
                                    <th>Importance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RECENT_MEETINGS_IMPORTANCE.map((m) => (
                                    <tr key={m.id}>
                                        <td style={{ maxWidth: 160 }}>
                                            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {m.title}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-blue" style={{ fontSize: 10 }}>{m.project.split(' ')[0]}</span>
                                        </td>
                                        <td>
                                            <div className="importance-bar-wrap">
                                                <div className="importance-bar-track">
                                                    <div className="importance-bar-fill" style={{ width: `${m.importanceScore}%` }} />
                                                </div>
                                                <span className="importance-pct">{m.importanceScore}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
