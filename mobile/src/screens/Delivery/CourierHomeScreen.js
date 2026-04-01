import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { deliveryAPI } from '../../services/api.service';
import socketService from '../../services/socket.service';

const NAVY  = '#1C2E4A';
const BROWN = '#5D4037';
const GREEN = '#2E7D32';
const ORANGE = '#F57F17';

const SIZE_LABEL = { petit: 'Petit', moyen: 'Moyen', lourd: 'Lourd' };
const SIZE_COLOR = { petit: '#1565C0', moyen: '#00897B', lourd: '#E65100' };
const fmt = n => Number(n || 0).toLocaleString('fr-FR');

const STATUS_META = {
    pending:   { label: 'En attente',   color: ORANGE,   bg: '#FFF8E1', icon: 'time-outline' },
    accepted:  { label: 'Acceptée',     color: '#1565C0', bg: '#DCEEFF', icon: 'bicycle-outline' },
    picked_up: { label: 'Colis pris',   color: GREEN,    bg: '#E8F5E9', icon: 'bag-outline' },
    delivered: { label: 'Livrée',       color: GREEN,    bg: '#E8F5E9', icon: 'checkmark-circle-outline' },
    cancelled: { label: 'Annulée',      color: '#C62828', bg: '#FFEBEE', icon: 'close-circle-outline' },
};

export default function CourierHomeScreen({ navigation }) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { active_services } = user || {};

    const hasAccess = active_services?.includes('courier');

    const [tab,         setTab]         = useState('available'); // 'available' | 'active' | 'history'
    const [deliveries,  setDeliveries]  = useState([]);
    const [active,      setActive]      = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // deliveryId being acted on

    const loadAvailable = useCallback(async () => {
        try {
            const r = await deliveryAPI.getAvailable();
            setDeliveries(r.data?.deliveries || []);
        } catch (_) {}
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    const loadActive = useCallback(async () => {
        try {
            const r = await deliveryAPI.getActive();
            setActive(r.data?.delivery || null);
        } catch (_) {}
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    const loadHistory = useCallback(async () => {
        try {
            const r = await deliveryAPI.getHistory();
            setDeliveries(r.data?.deliveries || []);
        } catch (_) {}
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    const reload = useCallback(() => {
        setLoading(true);
        if (tab === 'available') loadAvailable();
        else if (tab === 'active') loadActive();
        else loadHistory();
    }, [tab, loadAvailable, loadActive, loadHistory]);

    useEffect(() => { reload(); }, [reload]);

    // Real-time: new delivery request published
    useEffect(() => {
        const onNew = () => { if (tab === 'available') loadAvailable(); };
        socketService.on('new_delivery_request', onNew);
        return () => socketService.off('new_delivery_request', onNew);
    }, [tab, loadAvailable]);

    // Real-time: delivery I accepted was cancelled by sender
    useEffect(() => {
        const onCancelled = (data) => {
            if (active && data.deliveryId === active.id && data.cancelledBy === 'sender') {
                Alert.alert('Livraison annulée', 'Le client a annulé la livraison.', [{ text: 'OK' }]);
                setActive(null);
                setTab('available');
                loadAvailable();
            }
        };
        socketService.on('delivery_cancelled', onCancelled);
        return () => socketService.off('delivery_cancelled', onCancelled);
    }, [active, loadAvailable]);

    const handleAccept = async (delivery) => {
        setActionLoading(delivery.id);
        try {
            const r = await deliveryAPI.accept(delivery.id);
            setActive(r.data.delivery);
            setTab('active');
            Alert.alert('Livraison acceptée !', `Rendez-vous à : ${delivery.pickup_address}`, [{ text: 'OK' }]);
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible d\'accepter');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePickup = async () => {
        if (!active) return;
        setActionLoading(active.id);
        try {
            await deliveryAPI.pickup(active.id);
            setActive(prev => ({ ...prev, status: 'picked_up' }));
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de mettre à jour');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeliver = async () => {
        if (!active) return;
        Alert.alert('Confirmer la livraison', 'Avez-vous bien remis le colis au destinataire ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Oui, livré !', onPress: async () => {
                setActionLoading(active.id);
                try {
                    await deliveryAPI.deliver(active.id);
                    const earning = Math.round(parseFloat(active.fare) * 0.8);
                    Alert.alert('Livraison réussie !', `Félicitations ! ${fmt(earning)} XAF ont été crédités sur votre portefeuille.`, [{ text: 'OK' }]);
                    setActive(null);
                    setTab('history');
                    loadHistory();
                } catch (e) {
                    Alert.alert('Erreur', e.response?.data?.error || 'Impossible de confirmer');
                } finally {
                    setActionLoading(null);
                }
            }},
        ]);
    };

    // ── KYC guard ─────────────────────────────────────────────────────────────
    if (!hasAccess) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.kycWrap}>
                    <View style={styles.kycIcon}>
                        <Ionicons name="bicycle" size={52} color={BROWN} />
                    </View>
                    <Text style={styles.kycTitle}>Devenez Coursier Ombia</Text>
                    <Text style={styles.kycDesc}>
                        Pour effectuer des livraisons express, vous devez compléter la vérification coursier (CNI + selfie).
                        Notre équipe valide votre dossier sous 24–48h.
                    </Text>
                    <TouchableOpacity style={styles.kycBtn} onPress={() => navigation.navigate('CourierKyc')}>
                        <Ionicons name="document-text" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.kycBtnText}>Commencer la vérification</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.navigate('KycStatus', { type: 'courier' })}>
                        <Text style={{ color: BROWN, fontSize: 13, fontWeight: '600' }}>Voir l'état de mon dossier →</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const TABS = [
        { key: 'available', label: 'Disponibles' },
        { key: 'active',    label: 'En cours' },
        { key: 'history',   label: 'Historique' },
    ];

    const renderAvailableCard = ({ item }) => {
        const sColor = SIZE_COLOR[item.package_size] || '#888';
        const isActing = actionLoading === item.id;
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={[styles.sizeBadge, { backgroundColor: sColor + '18' }]}>
                        <Ionicons name="cube-outline" size={14} color={sColor} />
                        <Text style={[styles.sizeBadgeText, { color: sColor }]}>{SIZE_LABEL[item.package_size] || '—'}</Text>
                    </View>
                    <Text style={styles.cardFare}>{fmt(item.fare)} XAF</Text>
                </View>

                <View style={styles.routeBlock}>
                    <View style={styles.addrRow}>
                        <View style={styles.dotPickup} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addrLabel}>DÉPART</Text>
                            <Text style={styles.addrText} numberOfLines={2}>{item.pickup_address}</Text>
                        </View>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.addrRow}>
                        <View style={styles.dotDropoff} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addrLabel}>DESTINATION</Text>
                            <Text style={styles.addrText} numberOfLines={2}>{item.dropoff_address}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="navigate-outline" size={13} color="#888" />
                        <Text style={styles.metaText}>{item.distance_km?.toFixed(1) ?? '—'} km</Text>
                    </View>
                    {item.package_description ? (
                        <View style={styles.metaItem}>
                            <Ionicons name="information-circle-outline" size={13} color="#888" />
                            <Text style={styles.metaText} numberOfLines={1}>{item.package_description}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.earningRow}>
                    <Text style={styles.earningLabel}>Votre gain estimé</Text>
                    <Text style={styles.earningValue}>{fmt(Math.round(item.fare * 0.8))} XAF</Text>
                </View>

                <TouchableOpacity
                    style={[styles.acceptBtn, isActing && { opacity: 0.6 }]}
                    onPress={() => handleAccept(item)}
                    disabled={!!actionLoading}
                >
                    {isActing ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark" size={20} color="#fff" />
                            <Text style={styles.acceptBtnText}>Accepter cette livraison</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderHistoryCard = ({ item }) => {
        const sm = STATUS_META[item.status] || STATUS_META.cancelled;
        return (
            <View style={[styles.card, { padding: 14 }]}>
                <View style={styles.cardTop}>
                    <View style={[styles.sizeBadge, { backgroundColor: sm.bg }]}>
                        <Ionicons name={sm.icon} size={13} color={sm.color} />
                        <Text style={[styles.sizeBadgeText, { color: sm.color }]}>{sm.label}</Text>
                    </View>
                    <Text style={styles.cardFare}>{fmt(item.fare)} XAF</Text>
                </View>
                <Text style={styles.addrText} numberOfLines={1}>{item.pickup_address} → {item.dropoff_address}</Text>
                <Text style={styles.histDate}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.heading}>Espace Coursier</Text>
                    <Text style={styles.subheading}>Livraisons Express · Ombia</Text>
                </View>
                <View style={styles.badgeCourier}>
                    <Ionicons name="bicycle" size={14} color="#fff" />
                    <Text style={styles.badgeText}>Coursier</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {TABS.map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
                        onPress={() => setTab(t.key)}
                    >
                        <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Active delivery panel */}
            {tab === 'active' && (
                <View style={{ flex: 1 }}>
                    {loading ? (
                        <ActivityIndicator size="large" color={BROWN} style={{ marginTop: 40 }} />
                    ) : active ? (
                        <ScrollView
                            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 16 }]}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadActive(); }} tintColor={BROWN} />}
                        >
                            <View style={styles.card}>
                                {/* Status */}
                                {(() => {
                                    const sm = STATUS_META[active.status] || STATUS_META.accepted;
                                    return (
                                        <View style={[styles.statusBanner, { backgroundColor: sm.bg }]}>
                                            <Ionicons name={sm.icon} size={18} color={sm.color} />
                                            <Text style={[styles.statusBannerText, { color: sm.color }]}>{sm.label}</Text>
                                        </View>
                                    );
                                })()}

                                <View style={styles.routeBlock}>
                                    <View style={styles.addrRow}>
                                        <View style={styles.dotPickup} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.addrLabel}>RÉCUPÉRER CHEZ</Text>
                                            <Text style={styles.addrText}>{active.pickup_address}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.routeLine} />
                                    <View style={styles.addrRow}>
                                        <View style={styles.dotDropoff} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.addrLabel}>LIVRER À</Text>
                                            <Text style={styles.addrText}>{active.dropoff_address}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.earningRow}>
                                    <Text style={styles.earningLabel}>Votre gain</Text>
                                    <Text style={styles.earningValue}>{fmt(Math.round(parseFloat(active.fare) * 0.8))} XAF</Text>
                                </View>

                                {active.notes ? (
                                    <View style={styles.notesBlock}>
                                        <Ionicons name="chatbubble-outline" size={14} color="#888" />
                                        <Text style={styles.notesText}>{active.notes}</Text>
                                    </View>
                                ) : null}

                                <View style={styles.activeActions}>
                                    {active.status === 'accepted' && (
                                        <TouchableOpacity
                                            style={[styles.pickupBtn, actionLoading && { opacity: 0.6 }]}
                                            onPress={handlePickup}
                                            disabled={!!actionLoading}
                                        >
                                            {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                                                <>
                                                    <Ionicons name="bag-outline" size={20} color="#fff" />
                                                    <Text style={styles.actionBtnText}>Colis récupéré</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    {active.status === 'picked_up' && (
                                        <TouchableOpacity
                                            style={[styles.deliverBtn, actionLoading && { opacity: 0.6 }]}
                                            onPress={handleDeliver}
                                            disabled={!!actionLoading}
                                        >
                                            {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                                                <>
                                                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                                                    <Text style={styles.actionBtnText}>Livraison effectuée</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="bicycle-outline" size={60} color="#E0E0E0" />
                            <Text style={styles.emptyTitle}>Aucune livraison en cours</Text>
                            <Text style={styles.emptySub}>Acceptez une livraison dans l'onglet "Disponibles"</Text>
                            <TouchableOpacity onPress={() => setTab('available')} style={styles.emptyBtn}>
                                <Text style={styles.emptyBtnText}>Voir les livraisons disponibles</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Available / History list */}
            {(tab === 'available' || tab === 'history') && (
                loading ? (
                    <ActivityIndicator size="large" color={BROWN} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={deliveries}
                        keyExtractor={d => d.id}
                        renderItem={tab === 'available' ? renderAvailableCard : renderHistoryCard}
                        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} tintColor={BROWN} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyWrap}>
                                <Ionicons name={tab === 'available' ? 'bicycle-outline' : 'time-outline'} size={60} color="#E0E0E0" />
                                <Text style={styles.emptyTitle}>
                                    {tab === 'available' ? 'Aucune livraison disponible' : 'Aucune livraison terminée'}
                                </Text>
                                <Text style={styles.emptySub}>
                                    {tab === 'available' ? 'De nouvelles demandes apparaissent en temps réel' : 'Vos livraisons complètes apparaîtront ici'}
                                </Text>
                            </View>
                        )}
                    />
                )
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    kycWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    kycIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFEBE9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    kycTitle: { fontSize: 22, fontWeight: '800', color: NAVY, marginBottom: 12, textAlign: 'center' },
    kycDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    kycBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BROWN, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14, width: '100%' },
    kycBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    heading: { fontSize: 20, fontWeight: '800', color: NAVY },
    subheading: { fontSize: 12, color: '#aaa', marginTop: 2 },
    badgeCourier: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BROWN, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: BROWN },
    tabLabel: { fontSize: 13, fontWeight: '600', color: '#aaa' },
    tabLabelActive: { color: BROWN, fontWeight: '800' },

    list: { padding: 14, gap: 12 },
    scroll: { padding: 14 },

    card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 12 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardFare: { fontSize: 16, fontWeight: '800', color: BROWN },
    sizeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    sizeBadgeText: { fontSize: 12, fontWeight: '700' },

    routeBlock: { marginBottom: 12 },
    addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    addrLabel: { fontSize: 10, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
    addrText: { fontSize: 13, fontWeight: '600', color: NAVY, lineHeight: 18 },
    routeLine: { height: 16, width: 2, backgroundColor: '#E0E0E0', marginLeft: 5, marginVertical: 3 },
    dotPickup:  { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1565C0', marginTop: 3 },
    dotDropoff: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#C62828', marginTop: 3 },

    cardMeta: { flexDirection: 'row', gap: 14, marginBottom: 10, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: '#888' },

    earningRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F3FFFD', borderRadius: 10, padding: 10, marginBottom: 12 },
    earningLabel: { fontSize: 12, color: '#00897B', fontWeight: '600' },
    earningValue: { fontSize: 15, fontWeight: '800', color: '#00897B' },

    acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BROWN, paddingVertical: 14, borderRadius: 12, shadowColor: BROWN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 14 },
    statusBannerText: { fontSize: 14, fontWeight: '700' },

    notesBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F8F9FB', borderRadius: 10, padding: 10, marginBottom: 12 },
    notesText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },

    activeActions: { gap: 10 },
    pickupBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1565C0', paddingVertical: 14, borderRadius: 12 },
    deliverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GREEN, paddingVertical: 14, borderRadius: 12 },
    actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    histDate: { fontSize: 11, color: '#aaa', marginTop: 4 },

    emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: NAVY, marginTop: 16, marginBottom: 8, textAlign: 'center' },
    emptySub: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    emptyBtn: { backgroundColor: BROWN, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
