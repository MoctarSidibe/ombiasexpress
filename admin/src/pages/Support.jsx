import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Headset, ChatText, Warning, Question, Megaphone,
    CheckCircle, XCircle, ArrowLeft,
    MagnifyingGlass, CaretLeft, CaretRight, PaperPlaneTilt,
    ArrowCounterClockwise, Circle, User as UserIcon,
} from '@phosphor-icons/react';
import './Rides.css';
import api from '../api';
import { socket } from '../socket';

// ── Meta maps ─────────────────────────────────────────────────────────────────
const STATUS_META = {
    open:        { label: 'Ouvert',   bg: '#FFF3E0', color: '#E65100' },
    in_progress: { label: 'En cours', bg: '#E3F2FD', color: '#1565C0' },
    resolved:    { label: 'Résolu',   bg: '#E8F5E9', color: '#2E7D32' },
    closed:      { label: 'Fermé',    bg: '#F3F4F6', color: '#6B7280' },
};
const PRIORITY_META = {
    low:    { label: 'Basse',  color: '#9CA3AF', bg: '#F3F4F6' },
    medium: { label: 'Moyen',  color: '#D97706', bg: '#FEF3C7' },
    high:   { label: 'Haute',  color: '#DC2626', bg: '#FEE2E2' },
    urgent: { label: 'Urgent', color: '#7C3AED', bg: '#F3E8FF' },
};
const TYPE_ICON = { chat: ChatText, question: Question, complaint: Megaphone, incident: Warning };
const TYPE_LABEL = { chat: 'Discussion', question: 'Question', complaint: 'Réclamation', incident: 'Incident' };
const fmtDate = d => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60)    return 'À l\'instant';
    if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return fmtDate(date);
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, active, onClick }) {
    return (
        <div onClick={onClick} style={{
            background: active ? color + '18' : '#fff',
            border: `1.5px solid ${active ? color : '#E5E7EB'}`,
            borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
            minWidth: 110, textAlign: 'center', transition: 'all .15s',
        }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value ?? 0}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: 600 }}>{label}</div>
        </div>
    );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ ticket, onBack, onUpdated }) {
    const [messages, setMessages] = useState([]);
    const [reply,    setReply]    = useState('');
    const [sending,  setSending]  = useState(false);
    const [status,   setStatus]   = useState(ticket.status);
    const [priority, setPriority] = useState(ticket.priority);
    const [typing,   setTyping]   = useState(false);
    const listRef       = useRef(null);
    const typingTimer   = useRef(null);
    const agentTypingTimer = useRef(null);
    const replyRef      = useRef(null);

    // Load full ticket with messages
    useEffect(() => {
        api.get(`/admin/support/tickets/${ticket.id}`).then(({ data }) => {
            setMessages(data.ticket.messages || []);
            setStatus(data.ticket.status);
            setPriority(data.ticket.priority);
            setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: 'auto' }), 80);
        }).catch(() => {
            setMessages(ticket.messages || []);
        });
    }, [ticket.id]);

    // Real-time: join ticket room + listen for new messages
    useEffect(() => {
        socket.emit('join_support_room', { ticket_id: ticket.id });

        const onMessage = ({ ticket_id, message }) => {
            if (ticket_id !== ticket.id) return;
            setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
            setTyping(false);
        };

        const onTyping = ({ ticket_id, is_typing }) => {
            if (ticket_id !== ticket.id) return;
            setTyping(is_typing);
            if (is_typing) {
                clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => setTyping(false), 4000);
            }
        };

        socket.on('support_new_message', onMessage);
        socket.on('support_user_typing', onTyping);

        return () => {
            socket.emit('leave_support_room', { ticket_id: ticket.id });
            socket.off('support_new_message', onMessage);
            socket.off('support_user_typing', onTyping);
            clearTimeout(typingTimer.current);
            clearTimeout(agentTypingTimer.current);
        };
    }, [ticket.id]);

    // Auto-scroll on new messages
    useEffect(() => {
        setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 80);
    }, [messages.length]);

    const sendReply = async () => {
        const text = reply.trim();
        if (!text || sending) return;
        setSending(true);
        setReply('');
        try {
            const { data } = await api.post(`/admin/support/tickets/${ticket.id}/reply`, { content: text });
            setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]);
            if (data.status) setStatus(data.status);
            onUpdated?.({ ...ticket, status: data.status || status });
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur envoi');
            setReply(text);
        } finally {
            setSending(false);
            replyRef.current?.focus();
        }
    };

    const updateTicket = async (updates) => {
        try {
            await api.put(`/admin/support/tickets/${ticket.id}`, updates);
            if (updates.status)   setStatus(updates.status);
            if (updates.priority) setPriority(updates.priority);
            onUpdated?.({ ...ticket, ...updates });
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur');
        }
    };

    const TypeIcon = TYPE_ICON[ticket.type] || ChatText;
    const sm = STATUS_META[status] || {};
    const pm = PRIORITY_META[priority] || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 2, flexShrink: 0 }}>
                        <ArrowLeft size={18} color="#374151" />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <TypeIcon size={16} color="#1565C0" />
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#1C2E4A' }}>{ticket.subject}</span>
                            <span style={{ padding: '2px 10px', borderRadius: 20, background: sm.bg, color: sm.color, fontSize: 11, fontWeight: 600 }}>{sm.label}</span>
                            <span style={{ padding: '2px 10px', borderRadius: 20, background: pm.bg, color: pm.color, fontSize: 11, fontWeight: 600 }}>{pm.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                            {ticket.user?.name || ticket.user?.email || 'Utilisateur'} · {TYPE_LABEL[ticket.type]} · {fmtDate(ticket.created_at)}
                        </div>
                    </div>
                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                        {status !== 'resolved' && status !== 'closed' && (
                            <button onClick={() => updateTicket({ status: 'in_progress' })}
                                style={{ background: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                En cours
                            </button>
                        )}
                        {status !== 'resolved' && (
                            <button onClick={() => updateTicket({ status: 'resolved' })}
                                style={{ background: '#E8F5E9', color: '#2E7D32', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={13} />Résoudre
                            </button>
                        )}
                        {status !== 'closed' && (
                            <button onClick={() => updateTicket({ status: 'closed' })}
                                style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <XCircle size={13} />Fermer
                            </button>
                        )}
                        {(status === 'closed' || status === 'resolved') && (
                            <button onClick={() => updateTicket({ status: 'open' })}
                                style={{ background: '#FFF3E0', color: '#E65100', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ArrowCounterClockwise size={13} />Rouvrir
                            </button>
                        )}
                        {priority !== 'urgent' && (
                            <button onClick={() => updateTicket({ priority: 'urgent' })}
                                style={{ background: '#F3E8FF', color: '#7C3AED', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                🚨 Urgent
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* User info bar */}
            <div style={{ padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserIcon size={16} color="#1565C0" />
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2E4A' }}>{ticket.user?.name || 'Utilisateur'}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{ticket.user?.email} {ticket.user?.phone ? `· ${ticket.user.phone}` : ''}</div>
                </div>
                {ticket.service_type && ticket.service_type !== 'general' && (
                    <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, background: '#E3F2FD', color: '#1565C0', fontSize: 11, fontWeight: 600 }}>
                        {ticket.service_type}
                    </span>
                )}
            </div>

            {/* Messages */}
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, background: '#FAFAFA' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 40 }}>Chargement des messages…</div>
                )}
                {messages.map(m => {
                    const isSupport = m.sender_type === 'support';
                    const isBot     = m.sender_type === 'bot';
                    return (
                        <div key={m.id} style={{ display: 'flex', flexDirection: isSupport ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: 15, flexShrink: 0,
                                background: isSupport ? '#1565C0' : isBot ? '#EFF6FF' : '#E5E7EB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, color: isSupport ? '#fff' : '#6B7280', fontWeight: 700,
                            }}>
                                {isSupport ? (m.sender_name?.[0]?.toUpperCase() || 'S') : isBot ? '🤖' : (ticket.user?.name?.[0] || 'U')}
                            </div>
                            <div style={{ maxWidth: '70%' }}>
                                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, textAlign: isSupport ? 'right' : 'left' }}>
                                    {isSupport ? (m.sender_name || 'Support Ombia') : isBot ? 'Ombia Bot' : (ticket.user?.name || 'Utilisateur')} · {timeAgo(m.created_at)}
                                </div>
                                <div style={{
                                    background: isSupport ? '#1565C0' : isBot ? '#EFF6FF' : '#F3F4F6',
                                    color: isSupport ? '#fff' : '#1C2E4A',
                                    borderRadius: 14,
                                    borderBottomRightRadius: isSupport ? 4 : 14,
                                    borderBottomLeftRadius: isSupport ? 14 : 4,
                                    padding: '10px 14px', fontSize: 14, lineHeight: '1.5', whiteSpace: 'pre-wrap',
                                }}>
                                    {m.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {/* Typing indicator */}
                {typing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 15, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#6B7280', fontWeight: 700 }}>
                            {ticket.user?.name?.[0] || 'U'}
                        </div>
                        <div style={{ background: '#F3F4F6', borderRadius: 14, borderBottomLeftRadius: 4, padding: '10px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: '#9CA3AF', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Reply input */}
            {(status === 'open' || status === 'in_progress') ? (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fff' }}>
                    <textarea
                        ref={replyRef}
                        value={reply}
                        onChange={e => {
                            setReply(e.target.value);
                            // Emit typing indicator to user
                            socket.emit('support_agent_typing', { ticket_id: ticket.id, user_id: ticket.user_id, is_typing: true });
                            clearTimeout(agentTypingTimer.current);
                            agentTypingTimer.current = setTimeout(() => {
                                socket.emit('support_agent_typing', { ticket_id: ticket.id, user_id: ticket.user_id, is_typing: false });
                            }, 2000);
                        }}
                        placeholder="Réponse du support Ombia… (Ctrl+Entrée pour envoyer)"
                        rows={2}
                        style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', background: '#FAFAFA' }}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply(); }}
                    />
                    <button
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        style={{ background: '#1565C0', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: (!reply.trim() || sending) ? 0.5 : 1, height: 44 }}
                    >
                        <PaperPlaneTilt size={16} />{sending ? '…' : 'Envoyer'}
                    </button>
                </div>
            ) : (
                <div style={{ padding: '14px 20px', borderTop: '1px solid #F3F4F6', textAlign: 'center', color: '#9CA3AF', fontSize: 13, background: '#fff' }}>
                    Ticket {status === 'resolved' ? 'résolu' : 'fermé'} — rouvrez-le pour répondre
                </div>
            )}
        </div>
    );
}

// ── Main Support page ─────────────────────────────────────────────────────────
export default function Support() {
    const [tickets,   setTickets]   = useState([]);
    const [stats,     setStats]     = useState({ open: 0, in_progress: 0, resolved: 0, closed: 0, urgent: 0 });
    const [filter,    setFilter]    = useState('all');
    const [search,    setSearch]    = useState('');
    const [selected,  setSelected]  = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [connected, setConnected] = useState(false);
    const [toast,     setToast]     = useState(null);
    const [page,      setPage]      = useState(1);
    const LIMIT = 30;
    const selectedRef = useRef(null);
    selectedRef.current = selected;

    // ── Socket setup ──────────────────────────────────────────────────────────
    useEffect(() => {
        socket.connect();
        socket.emit('join_support_agents');

        const onConnect    = () => setConnected(true);
        const onDisconnect = () => setConnected(false);

        // New ticket from a user
        const onNewTicket = ({ ticket_id, subject, priority }) => {
            showToast(`🎫 Nouveau ticket : ${subject}`, priority === 'urgent' ? '#7C3AED' : '#1565C0');
            setTickets(prev => {
                if (prev.find(t => t.id === ticket_id)) return prev;
                // Reload to get full ticket with user data
                api.get(`/admin/support/tickets/${ticket_id}`).then(({ data }) => {
                    setTickets(p => [data.ticket, ...p.filter(t => t.id !== ticket_id)]);
                }).catch(() => {});
                return prev;
            });
            setStats(s => ({ ...s, open: s.open + 1 }));
        };

        // New message from a user (for ticket list updates when not in that chat)
        const onNewMessage = ({ ticket_id, message }) => {
            if (message.sender_type === 'user') {
                // If this ticket is NOT the currently open one, mark it with new unread
                if (selectedRef.current?.id !== ticket_id) {
                    setTickets(prev => prev.map(t =>
                        t.id === ticket_id
                            ? { ...t, unread_support: (t.unread_support || 0) + 1, last_message_at: message.created_at }
                            : t
                    ));
                    showToast('💬 Nouveau message reçu', '#1565C0');
                }
            }
        };

        socket.on('connect',            onConnect);
        socket.on('disconnect',         onDisconnect);
        socket.on('support_new_ticket', onNewTicket);
        socket.on('support_new_message', onNewMessage);

        return () => {
            socket.off('connect',            onConnect);
            socket.off('disconnect',         onDisconnect);
            socket.off('support_new_ticket', onNewTicket);
            socket.off('support_new_message', onNewMessage);
            socket.disconnect();
        };
    }, []);

    const showToast = (msg, color = '#1565C0') => {
        setToast({ msg, color });
        setTimeout(() => setToast(null), 4000);
    };

    // ── Load tickets ──────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: LIMIT };
            // 'urgent' filter means priority=urgent, not status
            if (filter === 'urgent') {
                params.priority = 'urgent';
            } else if (filter !== 'all') {
                params.status = filter;
            }
            if (search) params.search = search;
            const { data } = await api.get('/admin/support/tickets', { params });
            setTickets(data.tickets || []);
            if (data.stats) setStats(data.stats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, filter, search]);

    useEffect(() => { load(); }, [load]);

    const openTicket = async (t) => {
        try {
            const { data } = await api.get(`/admin/support/tickets/${t.id}`);
            setSelected(data.ticket);
            // Clear unread badge for this ticket in list
            setTickets(prev => prev.map(tk => tk.id === t.id ? { ...tk, unread_support: 0 } : tk));
        } catch {
            setSelected(t);
        }
    };

    const handleUpdated = (updated) => {
        setSelected(prev => ({ ...prev, ...updated }));
        setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    };

    const totalUnread = tickets.reduce((s, t) => s + (t.unread_support || 0), 0);

    // ── Chat view ─────────────────────────────────────────────────────────────
    if (selected) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                <ChatPanel ticket={selected} onBack={() => { setSelected(null); load(); }} onUpdated={handleUpdated} />
            </div>
        );
    }

    // ── Ticket list ───────────────────────────────────────────────────────────
    return (
        <div className="page-wrap" style={{ position: 'relative' }}>
            {/* Toast notification */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 24, zIndex: 9999,
                    background: toast.color, color: '#fff', padding: '12px 20px',
                    borderRadius: 12, fontSize: 14, fontWeight: 600,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'fadeIn .3s ease',
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Page header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Headset size={24} color="#1565C0" />
                    <h1 className="page-title">Support client</h1>
                    {totalUnread > 0 && (
                        <span style={{ background: '#EF4444', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                            {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                {/* Connection status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: connected ? '#16A34A' : '#9CA3AF' }}>
                    <Circle size={8} weight="fill" />
                    {connected ? 'Temps réel actif' : 'Connexion…'}
                </div>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 10, padding: '0 24px 20px', flexWrap: 'wrap' }}>
                <StatCard label="Tous"     value={(stats.open||0)+(stats.in_progress||0)+(stats.resolved||0)+(stats.closed||0)} color="#1565C0" active={filter==='all'}         onClick={() => { setFilter('all');         setPage(1); }} />
                <StatCard label="Ouverts"  value={stats.open}         color="#E65100" active={filter==='open'}        onClick={() => { setFilter('open');        setPage(1); }} />
                <StatCard label="En cours" value={stats.in_progress}  color="#1565C0" active={filter==='in_progress'} onClick={() => { setFilter('in_progress'); setPage(1); }} />
                <StatCard label="Résolus"  value={stats.resolved}     color="#2E7D32" active={filter==='resolved'}    onClick={() => { setFilter('resolved');    setPage(1); }} />
                <StatCard label="Fermés"   value={stats.closed}       color="#6B7280" active={filter==='closed'}      onClick={() => { setFilter('closed');      setPage(1); }} />
                <StatCard label="Urgents"  value={stats.urgent}       color="#7C3AED" active={filter==='urgent'}      onClick={() => { setFilter('urgent');      setPage(1); }} />
            </div>

            {/* Search */}
            <div style={{ padding: '0 24px 16px' }}>
                <div className="search-wrap">
                    <MagnifyingGlass size={16} color="#9CA3AF" />
                    <input
                        className="search-input"
                        placeholder="Rechercher par objet, utilisateur…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* Ticket list */}
            <div style={{ padding: '0 24px', flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Chargement…</div>
                ) : tickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                        <Headset size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                        <p>Aucun ticket trouvé</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {tickets.map(t => {
                            const sm        = STATUS_META[t.status] || {};
                            const pm        = PRIORITY_META[t.priority] || {};
                            const TypeIcon  = TYPE_ICON[t.type] || ChatText;
                            const hasUnread = t.unread_support > 0;
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => openTicket(t)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        background: '#fff',
                                        border: `1.5px solid ${hasUnread ? '#1565C0' : '#E5E7EB'}`,
                                        borderLeft: hasUnread ? '4px solid #1565C0' : '1.5px solid #E5E7EB',
                                        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                                        transition: 'all .15s',
                                    }}
                                >
                                    <div style={{ width: 42, height: 42, borderRadius: 12, background: sm.bg || '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <TypeIcon size={20} color={sm.color || '#6B7280'} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: hasUnread ? 800 : 600, fontSize: 14, color: '#1C2E4A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.subject}
                                            </span>
                                            {hasUnread && (
                                                <span style={{ background: '#EF4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                                    {t.unread_support}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {t.user?.name || t.user?.email || 'Utilisateur'} · {TYPE_LABEL[t.type]}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <span style={{ padding: '2px 8px', borderRadius: 20, background: sm.bg, color: sm.color, fontSize: 10, fontWeight: 600 }}>{sm.label}</span>
                                            <span style={{ padding: '2px 8px', borderRadius: 20, background: pm.bg, color: pm.color, fontSize: 10, fontWeight: 600 }}>{pm.label}</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(t.last_message_at || t.created_at)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {tickets.length === LIMIT && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
                    <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        <CaretLeft size={14} />
                    </button>
                    <span style={{ fontSize: 13, color: '#374151' }}>Page {page}</span>
                    <button className="page-btn" onClick={() => setPage(p => p + 1)}>
                        <CaretRight size={14} />
                    </button>
                </div>
            )}

            <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} } @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }`}</style>
        </div>
    );
}
