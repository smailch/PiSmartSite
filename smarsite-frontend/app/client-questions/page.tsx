"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import MainLayout from '@/components/MainLayout';
import { MessageCircle, Send, X, ChevronDown, ChevronUp } from 'lucide-react';

const API = 'http://localhost:3200';

export default function ClientQuestionsPage() {
    const router = useRouter();
    const [conversations, setConversations] = useState<any[]>([]); const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [sending, setSending] = useState<string | null>(null);
    const [error, setError] = useState('');

    const getToken = () => localStorage.getItem('token');

    // ✅ Admin + Director only
    useEffect(() => {
        try {
            const token = getToken();
            if (!token) { router.push('/login'); return; }
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.roleName !== 'Admin' && payload.roleName !== 'Director') {
                router.push('/');
            }
        } catch { router.push('/login'); }
    }, []);

    const fetchConversations = async () => {
        try {
            const token = getToken();
            const res = await axios.get(`${API}/messaging/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setConversations(Array.isArray(res.data) ? res.data : []);
        } catch { setError('Failed to load conversations.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchConversations(); }, []);

    const handleReply = async (conversationId: string) => {
        const content = replyText[conversationId]?.trim();
        if (!content) return;
        setSending(conversationId);
        try {
            const token = getToken();
            await axios.post(`${API}/messaging/reply/${conversationId}`, { content }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReplyText(prev => ({ ...prev, [conversationId]: '' }));
            fetchConversations();
        } catch { setError('Failed to send reply.'); }
        finally { setSending(null); }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const pendingCount = conversations.filter((c: any) => c.status === 'pending').length;

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
        .conv-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.1) !important; }
      `}</style>

            {/* Header */}
            <div style={s.pageHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={s.headerIcon}>
                        <MessageCircle size={24} color="#132849" />
                    </div>
                    <div>
                        <h1 style={s.pageTitle}>Client Questions</h1>
                        <p style={s.pageSubtitle}>
                            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                            {pendingCount > 0 && (
                                <span style={s.pendingBadge}>{pendingCount} pending</span>
                            )}
                        </p>
                    </div>
                </div>
                <button onClick={fetchConversations} style={s.refreshBtn}>
                    🔄 Refresh
                </button>
            </div>

            {error && <div style={s.errorBox}>{error}</div>}

            {conversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>No client questions yet</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>Questions transferred to Director will appear here</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {conversations.map((conv: any, idx: number) => (
                        <div key={conv.conversationId} className="conv-card" style={{
                            backgroundColor: 'white', borderRadius: '16px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                            border: conv.status === 'pending' ? '1px solid #fde68a' : '1px solid #e8edf5',
                            animation: `slideIn 0.3s ease ${idx * 0.05}s both`, overflow: 'hidden',
                            transition: 'box-shadow 0.2s',
                        }}>
                            {/* Conversation Header */}
                            <div style={{
                                padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px',
                                cursor: 'pointer', backgroundColor: conv.status === 'pending' ? '#fffbeb' : 'white'
                            }}
                                onClick={() => setExpanded(expanded === conv.conversationId ? null : conv.conversationId)}>

                                {/* Avatar */}
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '50%',
                                    backgroundColor: '#132849', display: 'flex', justifyContent: 'center',
                                    alignItems: 'center', fontSize: '16px', fontWeight: '800', color: '#FACC15', flexShrink: 0
                                }}>
                                    {conv.clientName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>
                                        {conv.clientName}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                                        {formatDate(conv.createdAt)} · {conv.messages?.length || 0} messages
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                        backgroundColor: conv.status === 'pending' ? '#fef3c7' : '#f0fdf4',
                                        color: conv.status === 'pending' ? '#92400e' : '#065f46',
                                        border: `1px solid ${conv.status === 'pending' ? '#fde68a' : '#86efac'}`,
                                    }}>
                                        {conv.status === 'pending' ? '⏳ Pending' : '✅ Replied'}
                                    </span>
                                    {expanded === conv.conversationId
                                        ? <ChevronUp size={18} color="#888" />
                                        : <ChevronDown size={18} color="#888" />
                                    }
                                </div>
                            </div>

                            {/* Conversation Messages */}
                            {expanded === conv.conversationId && (
                                <div style={{ borderTop: '1px solid #f0f4f8' }}>
                                    {/* Messages */}
                                    <div style={{
                                        padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px',
                                        maxHeight: '320px', overflowY: 'auto', backgroundColor: '#f8faff'
                                    }}>
                                        {conv.messages?.map((msg: any, i: number) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: msg.senderRole === 'Client' ? 'flex-end' : 'flex-start', gap: '8px'
                                            }}>
                                                {msg.senderRole !== 'Client' && (
                                                    <div style={{
                                                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                                        backgroundColor: msg.senderRole === 'Director' ? '#132849' : '#FACC15',
                                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                        fontSize: '10px', fontWeight: '800',
                                                        color: msg.senderRole === 'Director' ? '#FACC15' : '#132849'
                                                    }}>
                                                        {msg.senderRole === 'Director' ? 'D' : 'AI'}
                                                    </div>
                                                )}
                                                <div style={{
                                                    maxWidth: '70%', padding: '10px 14px', borderRadius: msg.senderRole === 'Client'
                                                        ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                    backgroundColor: msg.senderRole === 'Client' ? '#132849'
                                                        : msg.senderRole === 'Director' ? '#f0fdf4' : '#f4f6fb',
                                                    color: msg.senderRole === 'Client' ? 'white' : '#1a1a2e',
                                                    fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                                                }}>
                                                    <div style={{
                                                        fontSize: '10px', fontWeight: '700', marginBottom: '4px',
                                                        opacity: 0.7, textTransform: 'uppercase'
                                                    }}>
                                                        {msg.senderRole === 'AI' ? '🤖 AI Assistant' : msg.senderRole}
                                                    </div>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Reply Box */}
                                    <div style={{
                                        padding: '16px 24px', borderTop: '1px solid #f0f4f8',
                                        display: 'flex', gap: '10px', alignItems: 'flex-end'
                                    }}>
                                        <textarea
                                            value={replyText[conv.conversationId] || ''}
                                            onChange={e => setReplyText(prev => ({ ...prev, [conv.conversationId]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(conv.conversationId); } }}
                                            placeholder="Type your reply to the client..."
                                            rows={2}
                                            style={{
                                                flex: 1, border: '1px solid #e0e0e0', borderRadius: '10px',
                                                padding: '10px 14px', fontSize: '13px', resize: 'none', outline: 'none',
                                                fontFamily: 'inherit', backgroundColor: '#f8faff',
                                                color: '#1a1a2e',                 // ✅ ajoute
                                                WebkitTextFillColor: '#1a1a2e',  // ✅
                                            }}
                                        />
                                        <button
                                            onClick={() => handleReply(conv.conversationId)}
                                            disabled={!replyText[conv.conversationId]?.trim() || sending === conv.conversationId}
                                            style={{
                                                width: '42px', height: '42px', borderRadius: '10px', border: 'none',
                                                backgroundColor: replyText[conv.conversationId]?.trim() ? '#FACC15' : '#e0e0e0',
                                                cursor: replyText[conv.conversationId]?.trim() ? 'pointer' : 'not-allowed',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                            <Send size={16} color={replyText[conv.conversationId]?.trim() ? '#132849' : '#aaa'} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </MainLayout>
    );
}

const s = {
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    headerIcon: {
        width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f0f4ff',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    },
    pageTitle: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
    pageSubtitle: { fontSize: '13px', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' },
    pendingBadge: {
        backgroundColor: '#f97316', color: 'white', fontSize: '11px', fontWeight: '800',
        padding: '2px 8px', borderRadius: '20px'
    },
    refreshBtn: {
        display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', color: '#132849',
        border: '1px solid #d0d8e8', padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
        fontWeight: '600', fontSize: '13px'
    },
    errorBox: {
        backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
        borderRadius: '10px', padding: '12px 16px', fontSize: '13px', marginBottom: '16px'
    },
};