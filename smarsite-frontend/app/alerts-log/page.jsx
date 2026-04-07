"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import MainLayout from '@/components/MainLayout';
import { ShieldAlert, Brain, CheckCheck, RefreshCw } from 'lucide-react';

const API = 'http://localhost:3200';

const ACTION_CONFIG = {
    LOGIN_SUCCESS: { label: 'Login Success', bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
    LOGIN_FAILED: { label: 'Login Failed', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    LOGIN_FACE_ID: { label: 'Face ID Login', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
    PASSWORD_RESET: { label: 'Password Reset', bg: '#ede9fe', color: '#4c1d95', border: '#ddd6fe' },
    PASSWORD_RESET_REQUEST: { label: 'Reset Request', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    FACE_REGISTERED: { label: 'Face ID Registered', bg: '#f0fdf4', color: '#166534', border: '#86efac' },
    PROFILE_UPDATED: { label: 'Profile Updated', bg: '#f0f9ff', color: '#0c4a6e', border: '#bae6fd' },
};

export default function AlertsPage() {
    const router = useRouter();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState('');
    const [aiLoading, setAiLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [marking, setMarking] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [error, setError] = useState('');

    const getToken = () => localStorage.getItem('token');
    const [selectedReason, setSelectedReason] = useState(null);


    // ✅ Admin only
    useEffect(() => {
        try {
            const token = getToken();
            if (!token) { router.push('/login'); return; }
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.roleName !== 'Admin') router.push('/');
        } catch { router.push('/login'); }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            const token = getToken();
            const url = filter === 'suspicious'
                ? `${API}/audit-logs?suspicious=true`
                : `${API}/audit-logs`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch { setError('Failed to load audit logs.'); }
        finally { setLoading(false); }
    }, [filter]);

    const fetchAiSummary = async () => {
        setAiLoading(true);
        try {
            const token = getToken();
            const res = await axios.get(`${API}/audit-logs/ai-summary`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAiSummary(typeof res.data === 'string' ? res.data : res.data.summary || '');
        } catch { setAiSummary('Unable to generate AI summary at this time.'); }
        finally { setAiLoading(false); }
    };

    const fetchUnreadCount = useCallback(async () => {
        try {
            const token = getToken();
            const res = await axios.get(`${API}/audit-logs/unread-count`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUnreadCount(typeof res.data === 'number' ? res.data : 0);
        } catch { }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useEffect(() => { fetchAiSummary(); fetchUnreadCount(); }, []);

    const handleMarkAllRead = async () => {
        setMarking(true);
        try {
            const token = getToken();
            await axios.patch(`${API}/audit-logs/mark-all-read`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUnreadCount(0);
            fetchLogs();
        } catch { setError('Failed to mark alerts as read.'); }
        finally { setMarking(false); }
    };

    const handleMarkOneRead = async (id) => {
        try {
            const token = getToken();
            await axios.patch(`${API}/audit-logs/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLogs(prev => prev.map(l => l._id === id ? { ...l, read: true } : l));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const suspiciousCount = logs.filter(l => l.suspicious).length;

    if (loading) return (
        <MainLayout>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{
                    width: '40px', height: '40px', border: '3px solid #e0e0e0',
                    borderTopColor: '#132849', borderRadius: '50%', animation: 'spin 0.9s linear infinite'
                }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .log-row:hover { background-color: #f8faff !important; }
        .filter-btn:hover { opacity: 0.85; }
      `}</style>

            {/* Header */}
            <div style={s.pageHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={s.headerIcon}>
                        <ShieldAlert size={24} color="#132849" />
                    </div>
                    <div>
                        <h1 style={s.pageTitle}>Security Alerts</h1>
                        <p style={s.pageSubtitle}>
                            {suspiciousCount} suspicious event{suspiciousCount !== 1 ? 's' : ''} · {logs.length} total logs
                            {unreadCount > 0 && (
                                <span style={s.unreadBadge}>{unreadCount} unread</span>
                            )}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setLoading(true); fetchLogs(); fetchAiSummary(); }} style={s.refreshBtn}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} disabled={marking} style={s.markReadBtn}>
                            <CheckCheck size={16} />
                            {marking ? 'Marking...' : 'Mark all as read'}
                        </button>
                    )}
                </div>
            </div>

            {error && <div style={s.errorBox}>{error}</div>}

            {/* AI Summary Card */}
            <div style={s.aiCard}>
                <div style={s.aiCardHeader}>
                    <div style={s.aiIconWrap}>
                        <Brain size={20} color="#4c1d95" />
                    </div>
                    <div>
                        <div style={s.aiCardTitle}>AI Security Summary</div>
                        <div style={s.aiCardSubtitle}>Generated by Groq · Updates on refresh</div>
                    </div>
                    <span style={s.aiBadge}>AI</span>
                </div>
                <div style={s.aiCardBody}>
                    {aiLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888' }}>
                            <div style={{
                                width: '16px', height: '16px', border: '2px solid #e0e0e0',
                                borderTopColor: '#132849', borderRadius: '50%', animation: 'spin 0.9s linear infinite'
                            }} />
                            Analyzing security events...
                        </div>
                    ) : (
                        <p style={s.aiCardText}>{aiSummary}</p>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div style={s.statsRow}>
                {[
                    { label: 'Total Logs', value: logs.length, color: '#132849', bg: '#f0f4ff' },
                    { label: 'Suspicious', value: logs.filter(l => l.suspicious).length, color: '#dc2626', bg: '#fef2f2' },
                    { label: 'Failed Logins', value: logs.filter(l => l.action === 'LOGIN_FAILED').length, color: '#f97316', bg: '#fff7ed' },
                    { label: 'Successful', value: logs.filter(l => l.action === 'LOGIN_SUCCESS').length, color: '#065f46', bg: '#f0fdf4' },
                ].map((stat, i) => (
                    <div key={i} style={{ ...s.statCard, backgroundColor: stat.bg }}>
                        <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={s.filters}>
                {[
                    { key: 'all', label: 'All Logs' },
                    { key: 'suspicious', label: ' Suspicious Only' },
                ].map(f => (
                    <button key={f.key} className="filter-btn"
                        onClick={() => { setFilter(f.key); setLoading(true); }}
                        style={{
                            ...s.filterBtn,
                            backgroundColor: filter === f.key ? '#132849' : 'white',
                            color: filter === f.key ? 'white' : '#555',
                            border: filter === f.key ? '1px solid #132849' : '1px solid #e0e0e0',
                        }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={s.tableCard}>
                <table style={s.table}>
                    <thead>
                        <tr style={s.thead}>
                            <th style={s.th}>Date & Time</th>
                            <th style={s.th}>Action</th>
                            <th style={s.th}>Email</th>
                            <th style={s.th}>IP Address</th>
                            <th style={s.th}>Status</th>
                            <th style={s.th}>AI Reason</th>
                            <th style={{ ...s.th, textAlign: 'center' }}>Read</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#aaa', fontSize: '14px' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
                                    No logs found
                                </td>
                            </tr>
                        ) : logs.map((log, idx) => {
                            const config = ACTION_CONFIG[log.action] || ACTION_CONFIG['LOGIN_SUCCESS'];
                            return (
                                <tr key={log._id} className="log-row" style={{
                                    ...s.tr,
                                    backgroundColor: !log.read && log.suspicious ? '#fffbeb' : 'white',
                                    animation: `slideIn 0.3s ease ${idx * 0.03}s both`,
                                }}>
                                    {/* Date */}
                                    <td style={s.td}>
                                        <span style={{ fontSize: '12px', color: '#555', whiteSpace: 'nowrap' }}>
                                            {formatDate(log.createdAt)}
                                        </span>
                                    </td>

                                    {/* Action */}
                                    <td style={s.td}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                            backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}`,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {config.label}
                                        </span>
                                    </td>

                                    {/* Email */}
                                    <td style={s.td}>
                                        <span style={{ fontSize: '13px', color: '#333' }}>{log.email}</span>
                                    </td>

                                    {/* IP */}
                                    <td style={s.td}>
                                        <span style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
                                            {log.ip || '—'}
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td style={s.td}>
                                        {log.suspicious ? (
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                                backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
                                            }}>
                                                 Suspicious
                                            </span>
                                        ) : (
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                                backgroundColor: '#f0fdf4', color: '#065f46', border: '1px solid #86efac',
                                            }}>
                                                 Normal
                                            </span>
                                        )}
                                    </td>

                                    {/* AI Reason */}
                                    <td style={s.td}>
                                        {log.reason ? (
                                            <span
                                                onClick={() => setSelectedReason(log.reason)}
                                                style={{
                                                    fontSize: '12px', color: '#5d5fef', cursor: 'pointer',
                                                    textDecoration: 'underline', fontStyle: 'italic',
                                                    display: '-webkit-box', WebkitLineClamp: 1,
                                                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                                    maxWidth: '200px',
                                                }}
                                                title="Click to read full reason"
                                            >
                                                {log.reason.slice(0, 40)}...
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic' }}>—</span>
                                        )}
                                    </td>

                                    {/* Read */}
                                    <td style={{ ...s.td, textAlign: 'center' }}>
                                        {log.read ? (
                                            <span style={{ fontSize: '18px' }}>✓</span>
                                        ) : (
                                            <button onClick={() => handleMarkOneRead(log._id)} style={s.markOneBtn}
                                                title="Mark as read">
                                                <CheckCheck size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {selectedReason && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 200, backdropFilter: 'blur(4px)',
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px', padding: '32px',
                        width: '500px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{
                                fontSize: '11px', fontWeight: '800', letterSpacing: '3px',
                                color: '#132849', textTransform: 'uppercase', borderLeft: '3px solid #FACC15', paddingLeft: '10px'
                            }}>
                                Smartsite
                            </div>
                            <button onClick={() => setSelectedReason(null)}
                                style={{
                                    background: '#f4f4f5', border: 'none', borderRadius: '50%',
                                    width: '30px', height: '30px', cursor: 'pointer', fontSize: '13px'
                                }}>
                                ✕
                            </button>
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', marginBottom: '12px' }}>
                            🚨 AI Security Analysis
                        </h3>
                        <div style={{ backgroundColor: '#f8f7ff', borderRadius: '10px', padding: '16px' }}>
                            <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.7', margin: 0 }}>
                                {selectedReason}
                            </p>
                        </div>
                        <button onClick={() => setSelectedReason(null)}
                            style={{
                                marginTop: '20px', width: '100%', backgroundColor: '#132849', color: 'white',
                                border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer',
                                fontWeight: '700', fontSize: '14px'
                            }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

        </MainLayout>
    );
}

// ══════════════════════════════════════════════════════════════════
//  STYLES — même thème que UsersPage
// ══════════════════════════════════════════════════════════════════
const s = {
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    headerIcon: {
        width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f0f4ff',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    },
    pageTitle: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
    pageSubtitle: { fontSize: '13px', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' },
    unreadBadge: {
        backgroundColor: '#ef4444', color: 'white', fontSize: '11px', fontWeight: '800',
        padding: '2px 8px', borderRadius: '20px'
    },
    refreshBtn: {
        display: 'flex', alignItems: 'center', gap: '6px',
        backgroundColor: 'white', color: '#132849', border: '1px solid #d0d8e8',
        padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
        fontWeight: '600', fontSize: '13px', transition: '0.2s',
    },
    markReadBtn: {
        display: 'flex', alignItems: 'center', gap: '6px',
        backgroundColor: '#132849', color: 'white', border: 'none',
        padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
        fontWeight: '600', fontSize: '13px', transition: '0.2s',
    },
    errorBox: {
        backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
        borderRadius: '10px', padding: '12px 16px', fontSize: '13px', marginBottom: '16px'
    },

    // AI Card
    aiCard: {
        backgroundColor: 'white', borderRadius: '16px', padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.07)', marginBottom: '20px',
        border: '1px solid #ede9fe'
    },
    aiCardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
    aiIconWrap: {
        width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f5f3ff',
        display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
    },
    aiCardTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e' },
    aiCardSubtitle: { fontSize: '12px', color: '#888', marginTop: '2px' },
    aiBadge: {
        marginLeft: 'auto', backgroundColor: '#FACC15', color: '#000',
        fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '20px'
    },
    aiCardBody: { backgroundColor: '#f8f7ff', borderRadius: '10px', padding: '16px' },
    aiCardText: { fontSize: '13px', color: '#444', lineHeight: '1.7', margin: 0 },

    // Stats
    statsRow: { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' },
    statCard: {
        flex: 1, minWidth: '120px', borderRadius: '12px', padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    statValue: { fontSize: '28px', fontWeight: '800', lineHeight: 1 },
    statLabel: { fontSize: '12px', color: '#888', marginTop: '6px', fontWeight: '600' },

    // Filters
    filters: { display: 'flex', gap: '8px', marginBottom: '16px' },
    filterBtn: {
        padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
        fontWeight: '600', fontSize: '13px', transition: 'all 0.2s'
    },

    // Table
    tableCard: {
        backgroundColor: 'white', borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f8faff' },
    th: {
        padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700',
        color: '#132849', textTransform: 'uppercase', letterSpacing: '0.5px',
        borderBottom: '1px solid #e8edf5'
    },
    tr: { borderBottom: '1px solid #f0f4f8', transition: 'background-color 0.15s' },
    td: { padding: '12px 16px', verticalAlign: 'middle' },
    markOneBtn: {
        width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e0e0e0',
        backgroundColor: 'white', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#132849', transition: '0.15s'
    },
};