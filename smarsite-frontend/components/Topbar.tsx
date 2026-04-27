'use client';

import Image from 'next/image';
import { Bell, Settings, Bot, Send, X, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccessibilityMenu from '@/components/AccessibilityMenu';
import { createConversationId } from '@/lib/conversationId';
import { decodeJwtPayloadLoose } from '@/lib/jwtClientPayload';
import { getApiBaseUrl } from '@/lib/api';

interface User {
  fullName?: string;
  email?: string;
  profileImage?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  transferredToDirector?: boolean;
}

// ══════════════════════════════════════════════════════════════════
//  CHATBOT POPUP
// ══════════════════════════════════════════════════════════════════
const ChatbotPopup = ({ user, onClose }: { user: User | null; onClose: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hi ${user?.fullName || 'there'}! 👋 I'm your SmartSite AI Assistant. I can help you with:\n\n• Finding features and pages\n• Understanding your project status\n• General questions about SmartSite\n\nHow can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => createConversationId());
  const [transferred, setTransferred] = useState(false);
  const [directorReply, setDirectorReply] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Vérifier réponse Director toutes les 30s si transféré
  useEffect(() => {
    if (!transferred) return;
    const check = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${getApiBaseUrl()}/messaging/check-reply/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const directorMessages = data.filter((m: any) => m.senderRole === 'Director');
        if (directorMessages.length > 0) {
          const lastReply = directorMessages[directorMessages.length - 1];
          if (!directorReply) {
            setDirectorReply(lastReply.content);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `👤 **Director replied:**\n\n${lastReply.content}`,
            }]);
          }
        }
      } catch { }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [transferred, conversationId, directorReply]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const sessionHistory = messages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${getApiBaseUrl()}/messaging/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: text, conversationId, sessionHistory }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        transferredToDirector: data.transferredToDirector,
      }]);

      if (data.transferredToDirector) setTransferred(true);

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      width: '380px', height: '540px', backgroundColor: 'white',
      borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', zIndex: 300,
      border: '1px solid #e0e0e0', animation: 'chatIn 0.3s ease',
    }}>
      <style>{`
        @keyframes chatIn { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        .chat-msg-user { background: #132849; color: white; border-radius: 16px 16px 4px 16px; }
        .chat-msg-ai   { background: #f4f6fb; color: #1a1a2e; border-radius: 16px 16px 16px 4px; }
        .chat-input:focus { outline: none; }
        .send-btn:hover { filter: brightness(0.9); }
      `}</style>

      {/* Header */}
      <div style={{
        backgroundColor: '#132849', borderRadius: '20px 20px 0 0',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          backgroundColor: '#FACC15', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <Bot size={20} color="#132849" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>SmartSite AI</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
            {transferred ? '⏳ Transferred to Director' : '🟢 Online'}
          </div>
        </div>
        <span style={{
          backgroundColor: '#FACC15', color: '#132849', fontSize: '9px',
          fontWeight: '800', padding: '2px 7px', borderRadius: '20px', marginRight: '8px'
        }}>AI</span>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none',
          borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px', display: 'flex',
        flexDirection: 'column', gap: '12px', scrollbarWidth: 'thin'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FACC15',
                display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px', flexShrink: 0
              }}>
                <Bot size={14} color="#132849" />
              </div>
            )}
            <div className={msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}
              style={{
                maxWidth: '75%', padding: '10px 14px', fontSize: '13px', lineHeight: '1.6',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word'
              }}>
              {msg.content}
              {msg.transferredToDirector && (
                <div style={{
                  marginTop: '8px', padding: '6px 10px', backgroundColor: '#fef3c7',
                  borderRadius: '8px', fontSize: '11px', color: '#92400e', fontWeight: '600'
                }}>
                  ✅ Message forwarded to Director
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FACC15',
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
              <Bot size={14} color="#132849" />
            </div>
            <div style={{
              backgroundColor: '#f4f6fb', borderRadius: '16px 16px 16px 4px',
              padding: '10px 14px', display: 'flex', gap: '4px', alignItems: 'center'
            }}>
              <Loader2 size={14} color="#888" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '12px', color: '#888' }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid #f0f0f0',
        display: 'flex', gap: '8px', alignItems: 'flex-end'
      }}>
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask me anything about SmartSite..."
          rows={1}
          style={{
            flex: 1, border: '1px solid #e0e0e0', borderRadius: '12px',
            padding: '10px 14px', fontSize: '13px', resize: 'none',
            backgroundColor: '#f8faff', fontFamily: 'inherit', lineHeight: '1.4',
            color: '#1a1a2e',
            WebkitTextFillColor: '#1a1a2e',
          }}
        />
        <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}
          style={{
            width: '38px', height: '38px', borderRadius: '12px', border: 'none',
            backgroundColor: input.trim() ? '#FACC15' : '#e0e0e0',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
          <Send size={16} color={input.trim() ? '#132849' : '#aaa'} />
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  TOPBAR
// ══════════════════════════════════════════════════════════════════
export default function Topbar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      const payload = decodeJwtPayloadLoose(token);
      if (!payload) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      setUser({
        fullName: (payload.fullName as string | undefined) || (payload.name as string | undefined),
        email: payload.email as string | undefined,
        profileImage: payload.profileImage as string | undefined,
      });
      if (payload.roleName === 'Admin') setIsAdmin(true);
      if (payload.roleName === 'Client') setIsClient(true);

      fetch(`${getApiBaseUrl()}/users/${payload.sub}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setUser({ fullName: data.fullName, email: data.email, profileImage: data.profileImage }))
        .catch(() => { });
    } catch {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${getApiBaseUrl()}/audit-logs/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
        const count = await res.json();
        setUnreadAlerts(typeof count === 'number' ? count : 0);
      } catch { }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { localStorage.removeItem('token'); router.push('/login'); };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <>
      <style>{`
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .dd-item:hover   { background-color:#f4f6fb !important; }
        .dd-logout:hover { background-color:#fef2f2 !important; color:#dc2626 !important; }
        .avatar-btn:hover .avatar-overlay { opacity:1 !important; }
        .chat-fab:hover { transform: scale(1.08); }
      `}</style>

<header className="sticky top-0 z-40 border-b border-sidebar-border/60 bg-sidebar shadow-[4px_0_24px_-4px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="flex items-center justify-between h-16 px-4 md:px-8">
          <div className="hidden md:block" />
          <div className="flex items-center gap-4 ml-auto">

            {/* ✅ Bouton Ask AI — Client seulement */}
            {isClient && (
              <button
                onClick={() => setShowChatbot(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: showChatbot ? '#132849' : '#FACC15',
                  color: showChatbot ? 'white' : '#132849',
                  border: 'none', borderRadius: '10px', padding: '8px 14px',
                  cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                  transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <Bot size={16} />
                Ask AI
              </button>
            )}
             <AccessibilityMenu />
         

            {/* Bell avec badge */}
            <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => isAdmin && router.push('/alerts-log')}>
<Bell size={20} color="white" />
         {isAdmin && unreadAlerts > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  minWidth: '18px', height: '18px', borderRadius: '20px',
                  backgroundColor: '#ef4444', color: 'black',  // ✅ ajoute ça
                  fontSize: '10px', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '2px solid white'
                }}>
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </button>



            {/* Nom + Email */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{user?.fullName ?? '...'}</div>
<div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{user?.email ?? ''}</div>
            </div>

            {/* Avatar + Dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button className="avatar-btn" onClick={() => setShowUserMenu(v => !v)}
                style={{
                  width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #FACC15',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  backgroundColor: '#132849', padding: 0, transition: 'transform 0.2s'
                }}>
                {user?.profileImage ? (
                  <Image src={user.profileImage} alt="avatar" width={42} height={42} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', fontSize: '15px', fontWeight: '800', color: '#FACC15'
                  }}>
                    {initials}
                  </div>
                )}
                <div className="avatar-overlay" style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center',
                  alignItems: 'center', fontSize: '14px', opacity: 0, transition: 'opacity 0.2s'
                }}>✏️</div>
                <div style={{
                  position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px',
                  borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid white'
                }} />
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '240px',
                  backgroundColor: 'white', borderRadius: '14px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                  overflow: 'hidden', animation: 'dropIn 0.2s ease', border: '1px solid #eee', zIndex: 50
                }}>

                  {/* Header dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#132849' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1e3a5f',
                      border: '2px solid #FACC15', display: 'flex', justifyContent: 'center', alignItems: 'center',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {user?.profileImage
                        ? <Image src={user.profileImage} alt="avatar" width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '15px', fontWeight: '800', color: '#FACC15' }}>{initials}</span>
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{user?.fullName}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{user?.email}</div>
                    </div>
                  </div>

                  <div style={{ height: '1px', backgroundColor: '#f0f0f0' }} />

                  {/* Profile */}
                  <button className="dd-item" onClick={() => { setShowUserMenu(false); router.push('/profile'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                      border: 'none', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                      transition: 'background-color 0.15s', color: '#333'
                    }}>
                    <span style={{ fontSize: '18px' }}>👤</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>Edit Profile</div>
                      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>Information, password</div>
                    </div>
                  </button>

                  {/* Ask AI — Client seulement */}
                  {isClient && (
                    <>
                      <div style={{ height: '1px', backgroundColor: '#f0f0f0' }} />
                      <button className="dd-item" onClick={() => { setShowUserMenu(false); setShowChatbot(true); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                          border: 'none', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                          transition: 'background-color 0.15s', color: '#333'
                        }}>
                        <span style={{ fontSize: '18px' }}>🤖</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>Ask AI Assistant</div>
                          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>Powered by Groq</div>
                        </div>
                        <span style={{
                          backgroundColor: '#FACC15', color: '#132849', fontSize: '9px',
                          fontWeight: '800', padding: '2px 6px', borderRadius: '20px'
                        }}>AI</span>
                      </button>
                    </>
                  )}

                  {/* Security Alerts — Admin only */}
                  {isAdmin && (
                    <>
                      <div style={{ height: '1px', backgroundColor: '#f0f0f0' }} />
                      <button className="dd-item" onClick={() => { setShowUserMenu(false); router.push('/alerts-log'); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                          border: 'none', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                          transition: 'background-color 0.15s', color: '#333'
                        }}>
                        <span style={{ fontSize: '18px' }}>🚨</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>Security Alerts</div>
                          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>Audit logs & suspicious activity</div>
                        </div>
                        {unreadAlerts > 0 && (
                          <span style={{
                            backgroundColor: '#ef4444', color: 'white',
                            fontSize: '11px', fontWeight: '800', padding: '2px 7px', borderRadius: '20px'
                          }}>
                            {unreadAlerts}
                          </span>
                        )}
                      </button>
                    </>
                  )}

                  <div style={{ height: '1px', backgroundColor: '#f0f0f0' }} />

                  {/* Logout */}
                  <button className="dd-logout" onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                      border: 'none', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                      transition: 'background-color 0.15s', color: '#ef4444'
                    }}>
                    <span style={{ fontSize: '18px' }}>🚪</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>Logout</div>
                      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>Close session</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Chatbot Popup */}
      {showChatbot && isClient && (
        <ChatbotPopup user={user} onClose={() => setShowChatbot(false)} />
      )}
    </>
  );
}