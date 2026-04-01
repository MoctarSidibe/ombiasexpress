import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, RefreshControl, ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

const fmt     = n => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const SOURCE_LABEL = {
    ride_earning:   'Paiement QR reçu',
    rental_earning: 'Revenu location',
    transfer_in:    'Virement reçu',
    refund:         'Remboursement',
    promo:          'Promotion',
    airtel_money:   'Rechargement Airtel',
    moov_money:     'Rechargement Moov',
    bank_card:      'Rechargement carte',
};

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#1565C0','#7B1FA2','#00897B','#E53935','#FB8C00','#2E7D32','#D81B60','#0288D1'];
const getInitials = name => {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '??';
};
const getAvatarColor = name => {
    let h = 0;
    for (const c of (name || '')) h = h * 31 + c.charCodeAt(0);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

function BusinessAvatar({ logoUrl, name, size = 72, onPress }) {
    const initials = getInitials(name);
    const color    = getAvatarColor(name);
    return (
        <TouchableOpacity onPress={onPress} style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]} activeOpacity={0.8}>
            {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
            ) : (
                <View style={[styles.avatarInitials, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
                    <Text style={[styles.avatarText, { fontSize: size * 0.32 }]}>{initials}</Text>
                </View>
            )}
            {onPress && (
                <View style={styles.avatarEdit}>
                    <Ionicons name="camera" size={11} color="#fff" />
                </View>
            )}
        </TouchableOpacity>
    );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PartnerDashboardScreen({ navigation }) {
    const { user } = useAuth();
    const { role, active_services } = user || {};
    const insets = useSafeAreaInsets();

    const hasAccess = active_services?.includes('partner');
    if (!hasAccess) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.blockedWrap}>
                    <View style={styles.blockedIcon}>
                        <Ionicons name="storefront-outline" size={64} color="#00897B" />
                    </View>
                    <Text style={styles.blockedTitle}>Compte partenaire requis</Text>
                    <Text style={styles.blockedDesc}>
                        Pour accéder au tableau de bord partenaire et recevoir des paiements Ombia, complétez la vérification de votre activité.
                    </Text>
                    <TouchableOpacity style={styles.blockedBtn} onPress={() => navigation.navigate('ServiceActivation', { serviceKey: 'partner' })}>
                        <Ionicons name="document-text" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.blockedBtnText}>Commencer la vérification</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const [balance,      setBalance]      = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [stats,        setStats]        = useState({ today: 0, todayCount: 0, month: 0 });
    const [loading,      setLoading]      = useState(true);
    const [refreshing,   setRefreshing]   = useState(false);
    const [merchantInfo, setMerchantInfo] = useState(null);
    const [logoUrl,      setLogoUrl]      = useState(null);
    const [uploadingLogo,setUploadingLogo]= useState(false);

    const load = useCallback(async () => {
        try {
            const [walletRes, txRes, merchantRes] = await Promise.all([
                api.get('/wallet/balance'),
                api.get('/wallet/transactions?type=credit&limit=15'),
                api.get('/verifications/merchant/me'),
            ]);
            setBalance(walletRes.data?.balance ?? null);
            const txs = txRes.data?.transactions || [];
            setTransactions(txs);

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const todayTxs = txs.filter(t => new Date(t.created_at) >= today);
            const monthTxs = txs.filter(t => new Date(t.created_at) >= firstOfMonth);
            setStats({
                today:      todayTxs.reduce((s, t) => s + parseFloat(t.amount), 0),
                todayCount: todayTxs.length,
                month:      monthTxs.reduce((s, t) => s + parseFloat(t.amount), 0),
            });

            const mv = merchantRes.data?.verifications?.find(v => v.merchant_type === 'partner');
            if (mv) {
                setMerchantInfo(mv);
                setLogoUrl(mv.docs?.business_logo || null);
            }
        } catch (_) {}
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const pickLogo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour changer votre logo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (result.canceled) return;

        setUploadingLogo(true);
        try {
            const uri  = result.assets[0].uri;
            const name = uri.split('/').pop();
            const type = 'image/' + (name.split('.').pop() || 'jpeg');
            const fd   = new FormData();
            fd.append('photo', { uri, name, type });
            const uploadRes = await api.post('/products/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = uploadRes.data.url;
            await api.patch('/verifications/merchant/logo', { logo_url: url, merchant_type: 'partner' });
            setLogoUrl(url);
        } catch {
            Alert.alert('Erreur', 'Impossible de télécharger le logo.');
        } finally {
            setUploadingLogo(false);
        }
    };

    if (loading) {
        return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#00897B" style={{ marginTop: 60 }} /></SafeAreaView>;
    }

    const businessName = merchantInfo?.business_name || user?.name || 'Partenaire';
    const firstName    = user?.name?.split(' ')[0] || 'Partenaire';

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <BusinessAvatar
                        logoUrl={logoUrl}
                        name={businessName}
                        size={56}
                        onPress={uploadingLogo ? null : pickLogo}
                    />
                    {uploadingLogo && (
                        <View style={styles.logoLoader}>
                            <ActivityIndicator size="small" color="#fff" />
                        </View>
                    )}
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.greeting}>{businessName}</Text>
                        <Text style={styles.subtitle}>Bonjour, {firstName}</Text>
                    </View>
                </View>
                <View style={styles.badge}>
                    <Ionicons name="storefront" size={12} color="#fff" />
                    <Text style={styles.badgeText}>Partenaire</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#00897B" />}
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            >
                {/* Balance card */}
                <TouchableOpacity style={styles.balanceCard} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.86}>
                    <Text style={styles.balanceLabel}>Solde portefeuille</Text>
                    <Text style={styles.balanceValue}>{balance !== null ? `${fmt(balance)} XAF` : '— XAF'}</Text>
                    <Text style={styles.balanceSub}>Appuyez pour accéder au portefeuille →</Text>
                </TouchableOpacity>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { borderTopColor: '#00897B' }]}>
                        <Ionicons name="today" size={18} color="#00897B" />
                        <Text style={styles.statValue}>{fmt(stats.today)}</Text>
                        <Text style={styles.statLabel}>XAF aujourd'hui</Text>
                    </View>
                    <View style={[styles.statCard, { borderTopColor: '#FFA726' }]}>
                        <Ionicons name="receipt" size={18} color="#FFA726" />
                        <Text style={styles.statValue}>{stats.todayCount}</Text>
                        <Text style={styles.statLabel}>paiements reçus</Text>
                    </View>
                    <View style={[styles.statCard, { borderTopColor: '#1565C0' }]}>
                        <Ionicons name="calendar" size={18} color="#1565C0" />
                        <Text style={styles.statValue}>{fmt(stats.month)}</Text>
                        <Text style={styles.statLabel}>XAF ce mois</Text>
                    </View>
                </View>

                {/* Action buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionCard, { borderTopColor: '#00897B' }]} onPress={() => navigation.navigate('DriverQR')}>
                        <Ionicons name="qr-code" size={22} color="#00897B" />
                        <Text style={styles.actionCardText}>Recevoir{'\n'}un paiement</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionCard, { borderTopColor: '#1565C0' }]} onPress={() => navigation.navigate('WalletTransfer')}>
                        <Ionicons name="swap-horizontal" size={22} color="#1565C0" />
                        <Text style={styles.actionCardText}>Transférer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionCard, { borderTopColor: '#FFA726' }]} onPress={() => navigation.navigate('Wallet')}>
                        <Ionicons name="wallet" size={22} color="#FFA726" />
                        <Text style={styles.actionCardText}>Portefeuille</Text>
                    </TouchableOpacity>
                </View>

                {/* Scan info */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#00897B" />
                    <Text style={styles.infoText}>
                        Vos clients scannent votre QR code via l'app Ombia pour vous payer instantanément.
                    </Text>
                </View>

                {/* Business info */}
                {merchantInfo && (
                    <View style={styles.infoCard}>
                        <Text style={styles.sectionTitle}>Mon activité</Text>
                        {[
                            ['Nom commercial', merchantInfo.business_name],
                            ['Type', merchantInfo.business_type],
                            ['Ville', merchantInfo.city],
                            ['Téléphone', merchantInfo.phone],
                        ].filter(([, v]) => v).map(([l, v]) => (
                            <View key={l} style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{l}</Text>
                                <Text style={styles.infoValue}>{v}</Text>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.logoHint} onPress={pickLogo}>
                            <Ionicons name="camera-outline" size={14} color="#00897B" />
                            <Text style={styles.logoHintText}>
                                {logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Recent transactions */}
                <View style={styles.txSection}>
                    <Text style={styles.sectionTitle}>Derniers paiements reçus</Text>
                    {transactions.length === 0 ? (
                        <View style={styles.txEmpty}>
                            <Ionicons name="receipt-outline" size={36} color="#E0E0E0" />
                            <Text style={styles.txEmptyText}>Aucun paiement encore reçu</Text>
                        </View>
                    ) : (
                        transactions.map(t => (
                            <View key={t.id} style={styles.txRow}>
                                <View style={[styles.txIcon, { backgroundColor: '#D4F5F2' }]}>
                                    <Ionicons name="arrow-down-circle" size={20} color="#00897B" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.txDesc}>{SOURCE_LABEL[t.source] || t.description || 'Paiement reçu'}</Text>
                                    <Text style={styles.txDate}>{fmtDate(t.created_at)}</Text>
                                </View>
                                <Text style={styles.txAmount}>+{fmt(t.amount)} XAF</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    blockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    blockedIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#D4F5F2', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    blockedTitle: { fontSize: 22, fontWeight: '800', color: '#1C2E4A', marginBottom: 12, textAlign: 'center' },
    blockedDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    blockedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00897B', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14, width: '100%' },
    blockedBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    greeting:   { fontSize: 16, fontWeight: '800', color: '#1C2E4A' },
    subtitle:   { fontSize: 12, color: '#9AA3B0', marginTop: 1 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00897B', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    avatarWrap:     { overflow: 'hidden', borderWidth: 2, borderColor: '#D4F5F2' },
    avatarInitials: { alignItems: 'center', justifyContent: 'center' },
    avatarText:     { color: '#fff', fontWeight: '900' },
    avatarEdit: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: '#00897B', borderRadius: 10,
        width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#fff',
    },
    logoLoader: {
        position: 'absolute', left: 0, top: 0, width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },

    balanceCard: {
        marginHorizontal: 16, marginTop: 16, marginBottom: 0,
        backgroundColor: '#00897B', borderRadius: 18, padding: 20,
        shadowColor: '#00897B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    balanceValue: { fontSize: 30, fontWeight: '900', color: '#fff', marginVertical: 4 },
    balanceSub:   { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

    statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
    statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    statValue: { fontSize: 16, fontWeight: '800', color: '#1C2E4A', marginTop: 6 },
    statLabel: { fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 2, lineHeight: 13 },

    actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
    actionCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 6, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    actionCardText: { fontSize: 10, fontWeight: '700', color: '#1C2E4A', textAlign: 'center' },

    infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#D4F5F2', borderRadius: 12, marginHorizontal: 16, padding: 14, gap: 8, marginBottom: 16 },
    infoText: { flex: 1, fontSize: 12, color: '#00695C', lineHeight: 18 },

    infoCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    infoRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    infoLabel:{ fontSize: 12, color: '#aaa' },
    infoValue:{ fontSize: 13, fontWeight: '600', color: '#1C2E4A' },
    logoHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
    logoHintText: { fontSize: 13, color: '#00897B', fontWeight: '600' },

    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#1C2E4A', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.6 },
    txSection:  { marginHorizontal: 16, marginBottom: 8 },
    txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    txDesc: { fontSize: 13, fontWeight: '600', color: '#1C2E4A' },
    txDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: '800', color: '#00897B' },
    txEmpty: { alignItems: 'center', padding: 32, backgroundColor: '#fff', borderRadius: 14 },
    txEmptyText: { fontSize: 13, color: '#ccc', marginTop: 10, fontWeight: '500' },
});
