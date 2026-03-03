'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Mode = 'login' | 'register';

interface FieldError { name?: string; email?: string; password?: string; confirm?: string; }

export default function OrgPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>('login');
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldError>({});

    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });

    function switchMode(m: Mode) {
        setMode(m);
        setServerError('');
        setSuccessMsg('');
        setFieldErrors({});
        setForm({ name: '', email: '', password: '', confirm: '' });
    }

    function validate(): boolean {
        const errs: FieldError = {};
        if (mode === 'register' && !form.name.trim()) errs.name = 'Organisation name is required.';
        if (!form.email.trim()) errs.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
        if (!form.password) errs.password = 'Password is required.';
        else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
        if (mode === 'register' && form.password !== form.confirm) errs.confirm = 'Passwords do not match.';
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setServerError('');
        setSuccessMsg('');
        if (!validate()) return;

        setLoading(true);
        const endpoint = mode === 'login' ? '/api/org/login' : '/api/org/register';
        const payload = mode === 'login'
            ? { email: form.email, password: form.password }
            : { name: form.name, email: form.email, password: form.password };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                setServerError(data.error || 'Something went wrong.');
            } else {
                // Store org info in sessionStorage for use in dashboard
                sessionStorage.setItem('org', JSON.stringify(data.organization));
                if (mode === 'register') {
                    setSuccessMsg(`Organisation "${data.organization.name}" registered! Redirecting…`);
                    setTimeout(() => router.push('/'), 1500);
                } else {
                    router.push('/');
                }
            }
        } catch {
            setServerError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background grid + glow */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
                width: '600px', height: '600px',
                background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        marginBottom: '10px',
                    }}>
                        <div style={{
                            width: 40, height: 40,
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Building2 size={20} color="#fff" />
                        </div>
                        <span style={{
                            fontSize: '22px', fontWeight: 800,
                            background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px',
                        }}>
                            ScrumFlow<span style={{ color: '#3b82f6', WebkitTextFillColor: '#3b82f6' }}>.ai</span>
                        </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Execution Intelligence Platform
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '16px',
                    padding: '36px',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
                }}>
                    {/* Mode Tabs */}
                    <div style={{
                        display: 'flex',
                        background: 'var(--bg-secondary)',
                        borderRadius: '10px',
                        padding: '3px',
                        marginBottom: '28px',
                    }}>
                        {(['login', 'register'] as Mode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => switchMode(m)}
                                style={{
                                    flex: 1, padding: '8px 0', fontSize: '13px', fontWeight: 600,
                                    borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: mode === m ? 'var(--bg-card)' : 'transparent',
                                    color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                                }}
                            >
                                {m === 'login' ? 'Sign In' : 'Register'}
                            </button>
                        ))}
                    </div>

                    {/* Title */}
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: '4px' }}>
                            {mode === 'login' ? 'Welcome back' : 'Create organisation'}
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                            {mode === 'login'
                                ? 'Sign in to access your team\'s execution dashboard.'
                                : 'Register your organisation to get started with AAES.'}
                        </p>
                    </div>

                    {/* Server error / success */}
                    {serverError && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '8px', padding: '10px 12px', marginBottom: '20px',
                        }}>
                            <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: '#ef4444' }}>{serverError}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                            borderRadius: '8px', padding: '10px 12px', marginBottom: '20px',
                        }}>
                            <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: '#10b981' }}>{successMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Name — register only */}
                            {mode === 'register' && (
                                <OrgField
                                    id="org-name"
                                    label="Organisation Name"
                                    icon={<User size={14} color="var(--text-muted)" />}
                                    type="text"
                                    placeholder="e.g. Acme Corp"
                                    value={form.name}
                                    onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                                    error={fieldErrors.name}
                                    autoComplete="organization"
                                />
                            )}

                            <OrgField
                                id="org-email"
                                label="Email Address"
                                icon={<Mail size={14} color="var(--text-muted)" />}
                                type="email"
                                placeholder="admin@company.com"
                                value={form.email}
                                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                                error={fieldErrors.email}
                                autoComplete="email"
                            />

                            <OrgField
                                id="org-password"
                                label="Password"
                                icon={<Lock size={14} color="var(--text-muted)" />}
                                type="password"
                                placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                                value={form.password}
                                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                                error={fieldErrors.password}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            />

                            {mode === 'register' && (
                                <OrgField
                                    id="org-confirm"
                                    label="Confirm Password"
                                    icon={<Lock size={14} color="var(--text-muted)" />}
                                    type="password"
                                    placeholder="Re-enter password"
                                    value={form.confirm}
                                    onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
                                    error={fieldErrors.confirm}
                                    autoComplete="new-password"
                                />
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: '4px',
                                    width: '100%', padding: '11px 0',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                                    border: 'none', borderRadius: '8px',
                                    color: '#fff', fontSize: '14px', fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.75 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                {loading
                                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                                    : <>{mode === 'login' ? 'Sign In' : 'Create Organisation'} <ArrowRight size={15} /></>
                                }
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer note */}
                <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
                    {mode === 'login'
                        ? 'New here? Switch to Register above to create your organisation.'
                        : 'Already registered? Switch to Sign In above.'}
                </p>
            </div>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}

// ── Reusable field component ────────────────────────────────────────────────

function OrgField({
    id, label, icon, type, placeholder, value, onChange, error, autoComplete,
}: {
    id: string; label: string; icon: React.ReactNode;
    type: string; placeholder: string; value: string;
    onChange: (v: string) => void; error?: string; autoComplete?: string;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <label htmlFor={id} style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.3px',
            }}>
                {label}
            </label>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'var(--bg-secondary)',
                border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : focused ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                borderRadius: '8px', padding: '0 12px',
                transition: 'border-color 0.15s',
            }}>
                {icon}
                <input
                    id={id}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    autoComplete={autoComplete}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        flex: 1, padding: '10px 0',
                        background: 'transparent', border: 'none', outline: 'none',
                        color: 'var(--text-primary)', fontSize: '13px',
                    }}
                />
            </div>
            {error && (
                <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', marginLeft: '2px' }}>
                    {error}
                </p>
            )}
        </div>
    );
}
