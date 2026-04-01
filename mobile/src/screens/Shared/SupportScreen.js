import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert, ScrollView, Modal, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import socketService from '../../services/socket.service';
import { supportAPI } from '../../services/api.service';

// ── Meta ──────────────────────────────────────────────────────────────────────
const STATUS_COLOR = { open: '#F59E0B', in_progress: '#3B82F6', resolved: '#10B981', closed: '#9CA3AF' };
const STATUS_LABEL = { open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' };

const SERVICE_TYPES = [
    { key: 'general',  label: 'Général' },
    { key: 'ride',     label: 'Course' },
    { key: 'rental',   label: 'Location' },
    { key: 'delivery', label: 'Livraison' },
    { key: 'order',    label: 'Commande' },
];

const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60)    return 'À l\'instant';
    if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
const formatTime = (date) =>
    new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ── New Ticket / Quick chat modal ─────────────────────────────────────────────
function NewTicketModal({ visible, onClose, onCreated }) {
    const [message,     setMessage]     = useState('');
    const [serviceType, setServiceType] = useState('general');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [subject,     setSubject]     = useState('');
    const [loading,     setLoading]     = useState(false);

    const reset = () => {
        setMessage(''); setServiceType('general');
        setShowAdvanced(false); setSubject('');
    };

    const submit = async () => {
        const text = message.trim();
        if (!text) {
            Alert.alert('Message requis', 'Décrivez votre demande pour démarrer.');
            return;
        }
        setLoading(true);
        try {
            // Auto-generate subject from first 60 chars of message if not provided
            const autoSubject = subject.trim() || (text.length > 60 ? text.slice(0, 57) + '…' : text);
            const payload = {
                type: 'chat',
                subject: autoSubject,
                service_type: serviceType,
                first_message: text,
            };
            const { data } = await supportAPI.createTicket(payload);
            reset();
            onCreated(data.ticket);
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de démarrer la conversation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
                {/* Header */}
                <View style={S.modalHeader}>
                    <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={S.modalTitle}>Contacter le support</Text>
                    <TouchableOpacity onPress={submit} disabled={loading || !message.trim()} style={{ padding: 4 }}>
                        {loading
                            ? <ActivityIndicator size="small" color="#1565C0" />
                            : <Text style={[S.modalSend, !message.trim() && { opacity: 0.3 }]}>Envoyer</Text>}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                    {/* Welcome header */}
                    <View style={S.welcomeBox}>
                        <View style={S.welcomeIcon}>
                            <FontAwesome5 name="headset" size={24} color="#1565C0" />
                        </View>
                        <Text style={S.welcomeTitle}>Bonjour 👋</Text>
                        <Text style={S.welcomeText}>Notre équipe est disponible pour vous aider. Décrivez votre problème ci-dessous et nous vous répondrons rapidement.</Text>
                        <View style={S.responseTime}>
                            <Ionicons name="time-outline" size={13} color="#16A34A" />
                            <Text style={S.responseTimeText}>Réponse moyenne &lt; 10 min</Text>
                        </View>
                    </View>

                    {/* Message input — primary action */}
                    <Text style={S.fieldLabel}>Votre message *</Text>
                    <TextInput
                        style={[S.input, { height: 130, textAlignVertical: 'top' }]}
                        placeholder="Décrivez votre problème ou posez votre question…"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        autoFocus
                    />

                    {/* Advanced options toggle */}
                    <TouchableOpacity style={S.advancedToggle} onPress={() => setShowAdvanced(s => !s)}>
                        <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={14} color="#6B7280" />
                        <Text style={S.advancedToggleText}>Options avancées (service concerné, objet…)</Text>
                    </TouchableOpacity>

                    {showAdvanced && (
                        <>
                            <Text style={S.fieldLabel}>Service concerné</Text>
                            <View style={S.chips}>
                                {SERVICE_TYPES.map(s => (
                                    <TouchableOpacity key={s.key} style={[S.chip, serviceType === s.key && S.chipActive]} onPress={() => setServiceType(s.key)}>
                                        <Text style={[S.chipText, serviceType === s.key && { color: '#fff' }]}>{s.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[S.fieldLabel, { marginTop: 16 }]}>Objet (optionnel)</Text>
                            <TextInput
                                style={S.input}
                                placeholder="Résumé court de votre demande"
                                value={subject}
                                onChangeText={setSubject}
                                maxLength={200}
                            />
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

// ── Chat screen ───────────────────────────────────────────────────────────────
function ChatScreen({ ticket, onBack }) {
    const [messages,     setMessages]     = useState(ticket.messages || []);
    const [input,        setInput]        = useState('');
    const [sending,      setSending]      = useState(false);
    const [ticketStatus, setTicketStatus] = useState(ticket.status);
    const [agentTyping,  setAgentTyping]  = useState(false);
    const listRef     = useRef(null);
    const typingTimer = useRef(null);
    const myTypingTimer = useRef(null);

    useEffect(() => {
        setMessages(ticket.messages || []);
        setTicketStatus(ticket.status);
        socketService.emit('join_support_room', { ticket_id: ticket.id });
        return () => {
            socketService.emit('leave_support_room', { ticket_id: ticket.id });
            clearTimeout(typingTimer.current);
            clearTimeout(myTypingTimer.current);
        };
    }, [ticket.id]);

    // Real-time message listener
    useEffect(() => {
        const onMessage = ({ ticket_id, message }) => {
            if (ticket_id !== ticket.id) return;
            setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
            setAgentTyping(false);
        };
        // Agent typing indicator
        const onTyping = ({ ticket_id, is_typing }) => {
            if (ticket_id !== ticket.id) return;
            setAgentTyping(is_typing);
            if (is_typing) {
                clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => setAgentTyping(false), 5000);
            }
        };
        // Ticket resolved by agent
        const onResolved = ({ ticket_id }) => {
            if (ticket_id !== ticket.id) return;
            setTicketStatus('resolved');
        };

        socketService.on('support_new_message',   onMessage);
        socketService.on('support_agent_typing',  onTyping);
        socketService.on('support_ticket_resolved', onResolved);
        return () => {
            socketService.off('support_new_message',   onMessage);
            socketService.off('support_agent_typing',  onTyping);
            socketService.off('support_ticket_resolved', onResolved);
        };
    }, [ticket.id]);

    // Auto-scroll when messages change
    useEffect(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }, [messages.length, agentTyping]);

    // Emit typing indicator to agents
    const handleInputChange = (text) => {
        setInput(text);
        socketService.emit('support_user_typing', { ticket_id: ticket.id, is_typing: true });
        clearTimeout(myTypingTimer.current);
        myTypingTimer.current = setTimeout(() => {
            socketService.emit('support_user_typing', { ticket_id: ticket.id, is_typing: false });
        }, 2000);
    };

    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setInput('');
        socketService.emit('support_user_typing', { ticket_id: ticket.id, is_typing: false });
        try {
            const { data } = await supportAPI.sendMessage(ticket.id, text);
            setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]);
        } catch {
            Alert.alert('Erreur', 'Message non envoyé');
            setInput(text);
        } finally {
            setSending(false);
        }
    };

    const isClosed = ticketStatus === 'closed' || ticketStatus === 'resolved';
    const statusColor = STATUS_COLOR[ticketStatus] || '#9CA3AF';

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            {/* Header */}
            <View style={S.chatHeader}>
                <TouchableOpacity onPress={onBack} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <View style={S.chatHeaderInfo}>
                    <View style={S.agentAvatarRow}>
                        <View style={S.agentAvatar}>
                            <FontAwesome5 name="headset" size={14} color="#1565C0" />
                        </View>
                        <View>
                            <Text style={S.chatTitle} numberOfLines={1}>{ticket.subject}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <View style={[S.dot, { backgroundColor: statusColor }]} />
                                <Text style={S.chatSub}>{STATUS_LABEL[ticketStatus] || ticketStatus}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Messages */}
            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={m => m.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                ListFooterComponent={agentTyping ? (
                    <View style={[S.msgRow, { alignItems: 'flex-end', gap: 8, marginTop: 4 }]}>
                        <View style={[S.avatar, { backgroundColor: '#EFF6FF' }]}>
                            <FontAwesome5 name="headset" size={12} color="#1565C0" />
                        </View>
                        <View style={[S.bubble, S.typingBubble]}>
                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', height: 16 }}>
                                {[0, 1, 2].map(i => (
                                    <View key={i} style={[S.typingDot, { opacity: 0.4 + i * 0.2 }]} />
                                ))}
                            </View>
                        </View>
                    </View>
                ) : null}
                renderItem={({ item: m }) => {
                    const isUser = m.sender_type === 'user';
                    const isBot  = m.sender_type === 'bot';
                    return (
                        <View style={[S.msgRow, isUser && S.msgRowUser]}>
                            {!isUser && (
                                <View style={[S.avatar, { backgroundColor: isBot ? '#EFF6FF' : '#E8EEF7' }]}>
                                    <FontAwesome5 name="headset" size={12} color={isBot ? '#3B82F6' : '#1565C0'} />
                                </View>
                            )}
                            <View style={[S.bubble, isUser && S.bubbleUser, isBot && S.bubbleBot]}>
                                {!isUser && (
                                    <Text style={S.bubbleSender}>{isBot ? 'Ombia Bot' : (m.sender_name || 'Support Ombia')}</Text>
                                )}
                                <Text style={[S.bubbleText, isUser && { color: '#fff' }]}>{m.content}</Text>
                                <Text style={[S.bubbleTime, isUser && { color: 'rgba(255,255,255,0.65)' }]}>
                                    {formatTime(m.created_at)}
                                </Text>
                            </View>
                        </View>
                    );
                }}
            />

            {/* Input / closed banner */}
            {isClosed ? (
                <View style={S.closedBar}>
                    <Ionicons name="lock-closed-outline" size={13} color="#9CA3AF" />
                    <Text style={S.closedText}>
                        Ticket {ticketStatus === 'resolved' ? 'résolu ✓' : 'fermé'} — merci pour votre confiance
                    </Text>
                </View>
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={S.inputRow}>
                        <TextInput
                            style={S.chatInput}
                            placeholder="Votre message…"
                            value={input}
                            onChangeText={handleInputChange}
                            multiline
                            maxLength={2000}
                        />
                        <TouchableOpacity
                            style={[S.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
                            onPress={send}
                            disabled={sending || !input.trim()}
                        >
                            {sending
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Ionicons name="send" size={17} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}

// ── Ticket list ───────────────────────────────────────────────────────────────
export default function SupportScreen({ navigation }) {
    const [tickets,    setTickets]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [openTicket, setOpenTicket] = useState(null);
    const [showNew,    setShowNew]    = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            const { data } = await supportAPI.getTickets();
            setTickets(data.tickets || []);
        } catch { /* ignore */ }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    const openChat = useCallback(async (t) => {
        try {
            const { data } = await supportAPI.getTicket(t.id);
            setOpenTicket(data.ticket);
        } catch {
            setOpenTicket(t);
        }
    }, []);

    useEffect(() => { load(); }, []);

    const handleCreated = (ticket) => {
        setShowNew(false);
        setTickets(prev => [ticket, ...prev]);
        openChat(ticket);
    };

    // ── Chat view ─────────────────────────────────────────────────────────────
    if (openTicket) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
                <ChatScreen ticket={openTicket} onBack={() => { setOpenTicket(null); load(true); }} />
            </SafeAreaView>
        );
    }

    const hasOpenTicket = tickets.some(t => t.status === 'open' || t.status === 'in_progress');

    // ── Ticket list view ──────────────────────────────────────────────────────
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={S.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={S.headerTitle}>Support Ombia</Text>
                <TouchableOpacity style={S.newBtn} onPress={() => setShowNew(true)}>
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#1565C0" />
                </View>
            ) : tickets.length === 0 ? (
                /* Empty state — first-time, make it inviting */
                <View style={S.emptyWrap}>
                    <View style={S.emptyAvatarCircle}>
                        <FontAwesome5 name="headset" size={40} color="#1565C0" />
                    </View>
                    <Text style={S.emptyTitle}>Bonjour 👋</Text>
                    <Text style={S.emptyText}>
                        Notre équipe support est disponible pour vous aider avec vos courses, livraisons ou toute autre question.
                    </Text>
                    <View style={S.responseChip}>
                        <Ionicons name="time-outline" size={13} color="#16A34A" />
                        <Text style={S.responseChipText}>Réponse moyenne &lt; 10 min</Text>
                    </View>
                    <TouchableOpacity style={S.startChatBtn} onPress={() => setShowNew(true)}>
                        <FontAwesome5 name="comment-dots" size={16} color="#fff" />
                        <Text style={S.startChatBtnText}>Démarrer une conversation</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Active chat banner */}
                    {hasOpenTicket && (
                        <TouchableOpacity
                            style={S.activeBanner}
                            onPress={() => openChat(tickets.find(t => t.status === 'open' || t.status === 'in_progress'))}
                        >
                            <View style={S.activeDot} />
                            <Text style={S.activeBannerText}>Conversation en cours — touchez pour reprendre</Text>
                            <Ionicons name="chevron-forward" size={15} color="#1565C0" />
                        </TouchableOpacity>
                    )}

                    <FlatList
                        data={tickets}
                        keyExtractor={t => t.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                        refreshing={refreshing}
                        onRefresh={() => load(true)}
                        renderItem={({ item: t }) => {
                            const lastMsg  = t.messages?.[0];
                            const unread   = (t.unread_user || 0) > 0;
                            const sc       = STATUS_COLOR[t.status] || '#9CA3AF';
                            const isActive = t.status === 'open' || t.status === 'in_progress';
                            return (
                                <TouchableOpacity
                                    style={[S.card, unread && S.cardUnread, isActive && S.cardActive]}
                                    onPress={() => openChat(t)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[S.cardIcon, { backgroundColor: sc + '18' }]}>
                                        <FontAwesome5 name="headset" size={18} color={sc} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={[S.cardSubject, unread && { fontWeight: '800' }]} numberOfLines={1}>{t.subject}</Text>
                                            <Text style={S.cardTime}>{timeAgo(t.last_message_at || t.created_at)}</Text>
                                        </View>
                                        {lastMsg && (
                                            <Text style={S.cardPreview} numberOfLines={1}>
                                                {lastMsg.sender_type === 'user' ? 'Vous : ' : lastMsg.sender_type === 'support' ? 'Support : ' : ''}{lastMsg.content}
                                            </Text>
                                        )}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                                            <View style={[S.statusBadge, { backgroundColor: sc + '18' }]}>
                                                <Text style={[S.statusText, { color: sc }]}>{STATUS_LABEL[t.status]}</Text>
                                            </View>
                                            {unread && (
                                                <View style={S.unreadDot}>
                                                    <Text style={S.unreadDotText}>{t.unread_user}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={15} color="#D1D5DB" style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            );
                        }}
                    />
                </>
            )}

            <NewTicketModal visible={showNew} onClose={() => setShowNew(false)} onCreated={handleCreated} />
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    // List screen
    header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1C2E4A', marginLeft: 10 },
    newBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' },
    backBtn:     { padding: 2 },

    // Empty state
    emptyWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyAvatarCircle:{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle:       { fontSize: 22, fontWeight: '800', color: '#1C2E4A', marginBottom: 10 },
    emptyText:        { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
    responseChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 28 },
    responseChipText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
    startChatBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1565C0', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    startChatBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Active banner
    activeBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', margin: 16, marginBottom: 0, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#BFDBFE' },
    activeDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
    activeBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1565C0' },

    // Ticket cards
    card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardUnread:  { borderLeftWidth: 3, borderLeftColor: '#1565C0' },
    cardActive:  { borderWidth: 1, borderColor: '#BFDBFE' },
    cardIcon:    { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    cardSubject: { fontSize: 14, fontWeight: '600', color: '#1C2E4A', flex: 1, marginRight: 8 },
    cardTime:    { fontSize: 11, color: '#9CA3AF' },
    cardPreview: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    statusText:  { fontSize: 10, fontWeight: '600' },
    unreadDot:   { backgroundColor: '#1565C0', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    unreadDotText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // Modal
    modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalTitle:     { fontSize: 16, fontWeight: '700', color: '#1C2E4A' },
    modalSend:      { fontSize: 14, fontWeight: '700', color: '#1565C0' },
    welcomeBox:     { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
    welcomeIcon:    { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#1565C0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
    welcomeTitle:   { fontSize: 18, fontWeight: '800', color: '#1C2E4A', marginBottom: 6 },
    welcomeText:    { fontSize: 13, color: '#4B5563', textAlign: 'center', lineHeight: 20, marginBottom: 10 },
    responseTime:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    responseTimeText: { fontSize: 11, fontWeight: '600', color: '#16A34A' },
    fieldLabel:     { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginTop: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
    input:          { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#1C2E4A', backgroundColor: '#FAFAFA' },
    advancedToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 8 },
    advancedToggleText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
    chipActive:     { backgroundColor: '#1565C0', borderColor: '#1565C0' },
    chipText:       { fontSize: 12, fontWeight: '600', color: '#6B7280' },

    // Chat
    chatHeader:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
    chatHeaderInfo: { flex: 1 },
    agentAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    agentAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
    chatTitle:      { fontSize: 15, fontWeight: '700', color: '#1C2E4A' },
    chatSub:        { fontSize: 11, color: '#6B7280', marginTop: 1 },
    dot:            { width: 7, height: 7, borderRadius: 4 },

    msgRow:      { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end', gap: 8 },
    msgRowUser:  { justifyContent: 'flex-end' },
    avatar:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    bubble:      { maxWidth: '75%', backgroundColor: '#F3F4F6', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12 },
    bubbleUser:  { backgroundColor: '#1565C0', borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
    bubbleBot:   { backgroundColor: '#EFF6FF' },
    bubbleSender:{ fontSize: 10, fontWeight: '700', color: '#6B7280', marginBottom: 3 },
    bubbleText:  { fontSize: 14, color: '#1C2E4A', lineHeight: 20 },
    bubbleTime:  { fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },

    typingBubble: { paddingVertical: 14, paddingHorizontal: 16 },
    typingDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9CA3AF' },

    inputRow:    { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
    chatInput:   { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1C2E4A', maxHeight: 100, backgroundColor: '#FAFAFA' },
    sendBtn:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' },

    closedBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    closedText:  { fontSize: 13, color: '#9CA3AF' },
});
