import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api.service';

// ── WalletTransferScreen ──────────────────────────────────────────────────────
// Allows a user to send wallet balance to another user by phone or email.
const WalletTransferScreen = ({ navigation }) => {
    const [recipient,  setRecipient]  = useState('');
    const [amount,     setAmount]     = useState('');
    const [message,    setMessage]    = useState('');
    const [resolvedUser, setResolvedUser] = useState(null);  // { id, name, phone }
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError,   setLookupError]   = useState('');
    const [sending,    setSending]    = useState(false);

    // ── Lookup recipient ─────────────────────────────────────────────────────
    const lookup = useCallback(async () => {
        if (!recipient.trim() || recipient.trim().length < 3) {
            setLookupError('Entrez au moins 3 caractères');
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        setResolvedUser(null);
        try {
            const res = await api.get(`/wallet/lookup-user?q=${encodeURIComponent(recipient.trim())}`);
            setResolvedUser(res.data.user);
        } catch (e) {
            setLookupError(e.response?.data?.error || 'Utilisateur introuvable');
        }
        setLookupLoading(false);
    }, [recipient]);

    // ── Send transfer ────────────────────────────────────────────────────────
    const send = async () => {
        const amt = parseFloat(amount);
        if (!resolvedUser) { Alert.alert('', 'Recherchez d\'abord un destinataire'); return; }
        if (!amt || amt < 100) { Alert.alert('', 'Montant minimum : 100 XAF'); return; }

        Alert.alert(
            'Confirmer le transfert',
            `Envoyer ${amt.toLocaleString('fr-FR')} XAF à ${resolvedUser.name} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Envoyer', style: 'destructive',
                    onPress: async () => {
                        setSending(true);
                        try {
                            const res = await api.post('/wallet/transfer', {
                                recipient: recipient.trim(),
                                amount:    amt,
                                message:   message.trim() || undefined,
                            });
                            Alert.alert('Envoyé ✓', res.data.message, [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } catch (e) {
                            Alert.alert('Erreur', e.response?.data?.error || 'Échec du transfert');
                        }
                        setSending(false);
                    }
                }
            ]
        );
    };

    const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F2F4F8" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Envoyer de l'argent</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Info banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="flash" size={14} color="#FFA726" />
                        <Text style={styles.infoText}>Transferts instantanés et gratuits entre portefeuilles Ombia</Text>
                    </View>

                    {/* ── Step 1: Recipient ── */}
                    <View style={styles.card}>
                        <View style={styles.stepRow}>
                            <View style={styles.stepBubble}><Text style={styles.stepNum}>1</Text></View>
                            <Text style={styles.stepTitle}>Destinataire</Text>
                        </View>

                        <Text style={styles.fieldLabel}>Numéro de téléphone ou email</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="person-outline" size={18} color="#9AA3B0" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: 077 123 456 ou user@mail.com"
                                value={recipient}
                                onChangeText={t => { setRecipient(t); setResolvedUser(null); setLookupError(''); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                returnKeyType="search"
                                onSubmitEditing={lookup}
                            />
                            {recipient.trim().length >= 3 && !resolvedUser && (
                                <TouchableOpacity onPress={lookup} style={styles.searchBtn} disabled={lookupLoading}>
                                    {lookupLoading
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Ionicons name="search" size={16} color="#fff" />}
                                </TouchableOpacity>
                            )}
                        </View>

                        {lookupError ? (
                            <Text style={styles.errorText}>{lookupError}</Text>
                        ) : null}

                        {/* Resolved user card */}
                        {resolvedUser && (
                            <View style={styles.resolvedCard}>
                                <View style={styles.resolvedAvatar}>
                                    <Text style={styles.resolvedAvatarText}>
                                        {resolvedUser.name[0].toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.resolvedName}>{resolvedUser.name}</Text>
                                    <Text style={styles.resolvedPhone}>{resolvedUser.phone}</Text>
                                </View>
                                <Ionicons name="checkmark-circle" size={22} color="#43A047" />
                            </View>
                        )}
                    </View>

                    {/* ── Step 2: Amount ── */}
                    <View style={styles.card}>
                        <View style={styles.stepRow}>
                            <View style={styles.stepBubble}><Text style={styles.stepNum}>2</Text></View>
                            <Text style={styles.stepTitle}>Montant</Text>
                        </View>

                        {/* Quick amounts */}
                        <View style={styles.quickRow}>
                            {QUICK_AMOUNTS.map(q => (
                                <TouchableOpacity
                                    key={q}
                                    style={[styles.quickBtn, amount === String(q) && styles.quickBtnActive]}
                                    onPress={() => setAmount(String(q))}
                                >
                                    <Text style={[styles.quickBtnText, amount === String(q) && styles.quickBtnTextActive]}>
                                        {q.toLocaleString('fr-FR')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.amountInputRow}>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                            />
                            <Text style={styles.amountCurrency}>XAF</Text>
                        </View>
                    </View>

                    {/* ── Step 3: Optional message ── */}
                    <View style={styles.card}>
                        <View style={styles.stepRow}>
                            <View style={[styles.stepBubble, { backgroundColor: '#F3F4F6' }]}>
                                <Text style={[styles.stepNum, { color: '#9AA3B0' }]}>3</Text>
                            </View>
                            <Text style={styles.stepTitle}>Note <Text style={styles.optional}>(optionnel)</Text></Text>
                        </View>
                        <View style={styles.inputRow}>
                            <Ionicons name="chatbubble-outline" size={18} color="#9AA3B0" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Motif du transfert…"
                                value={message}
                                onChangeText={setMessage}
                                maxLength={80}
                            />
                        </View>
                    </View>

                    {/* ── Send button ── */}
                    <TouchableOpacity
                        style={[styles.sendBtn, (!resolvedUser || !amount) && styles.sendBtnDisabled]}
                        onPress={send}
                        disabled={!resolvedUser || !amount || sending}
                    >
                        {sending ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="paper-plane" size={18} color="#fff" />
                                <Text style={styles.sendBtnText}>
                                    {amount && parseFloat(amount) >= 100
                                        ? `Envoyer ${parseFloat(amount).toLocaleString('fr-FR')} XAF`
                                        : 'Envoyer'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Security note */}
                    <View style={styles.secNote}>
                        <Ionicons name="shield-checkmark-outline" size={13} color="#9AA3B0" />
                        <Text style={styles.secNoteText}>Transfert sécurisé · Instantané · Sans frais entre membres Ombia</Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },

    scroll: { padding: 16, paddingBottom: 40 },

    infoBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,167,38,0.1)', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,167,38,0.2)',
    },
    infoText: { color: '#CC8400', fontSize: 12, fontWeight: '600', flex: 1 },

    card: {
        backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12,
        borderWidth: 1, borderColor: '#EAECF0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    stepRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    stepBubble: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFA726', alignItems: 'center', justifyContent: 'center' },
    stepNum:    { color: '#fff', fontSize: 12, fontWeight: '900' },
    stepTitle:  { fontSize: 14, fontWeight: '800', color: '#1C2E4A' },
    optional:   { fontWeight: '400', color: '#9AA3B0', fontSize: 13 },

    fieldLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 14,
        backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 4,
    },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: '#1C2E4A', paddingVertical: 10 },
    searchBtn: {
        backgroundColor: '#FFA726', borderRadius: 10,
        padding: 8, marginLeft: 8,
    },
    errorText: { color: '#E53935', fontSize: 12, marginTop: 6, marginLeft: 4 },

    resolvedCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(67,160,71,0.07)', borderRadius: 12,
        padding: 12, marginTop: 12, gap: 12,
        borderWidth: 1, borderColor: 'rgba(67,160,71,0.2)',
    },
    resolvedAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center',
    },
    resolvedAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    resolvedName:  { fontSize: 14, fontWeight: '700', color: '#1C2E4A' },
    resolvedPhone: { fontSize: 12, color: '#6B7280', marginTop: 2 },

    quickRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    quickBtn: {
        flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
        backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E8EAF0',
    },
    quickBtnActive:     { backgroundColor: 'rgba(255,167,38,0.12)', borderColor: '#FFA726' },
    quickBtnText:       { fontSize: 12, fontWeight: '700', color: '#6B7280' },
    quickBtnTextActive: { color: '#FFA726' },

    amountInputRow: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFA726', borderRadius: 14,
        backgroundColor: '#FFF8EE', paddingHorizontal: 16,
    },
    amountInput: { flex: 1, fontSize: 32, fontWeight: '900', color: '#1C2E4A', paddingVertical: 12 },
    amountCurrency: { fontSize: 16, fontWeight: '800', color: '#FFA726' },

    sendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFA726', borderRadius: 16, paddingVertical: 16, gap: 10,
        marginTop: 4, marginBottom: 12,
        shadowColor: '#FFA726', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    sendBtnDisabled: { backgroundColor: '#D0D8E0', shadowOpacity: 0 },
    sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    secNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    secNoteText: { fontSize: 11, color: '#B0B8C4', textAlign: 'center' },
});

export default WalletTransferScreen;
