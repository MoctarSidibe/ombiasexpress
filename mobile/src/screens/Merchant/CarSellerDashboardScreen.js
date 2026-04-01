import { API_BASE } from '../../services/api.service';
import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, RefreshControl, Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import socketService from '../../services/socket.service';

const fullUrl  = url => (!url ? null : url.startsWith('http') ? url : `${API_BASE}${url}`);
const fmt      = n => Number(n || 0).toLocaleString('fr-FR');

const STATUS_META = {
    pending:  { label: 'En examen',  color: '#F59E0B', bg: '#FFFBEB' },
    active:   { label: 'Active',     color: '#2E7D32', bg: '#E8F5E9' },
    rejected: { label: 'Refusée',    color: '#C62828', bg: '#FFEBEE' },
    sold:     { label: 'Vendue',     color: '#7B1FA2', bg: '#F3E5F5' },
    paused:   { label: 'En pause',   color: '#888',    bg: '#F5F5F5' },
};

export default function CarSellerDashboardScreen({ navigation }) {
    const { user } = useAuth();
    const { role, active_services } = user || {};
    const insets = useSafeAreaInsets();

    // ── KYC guard ─────────────────────────────────────────────────────────────
    const hasAccess = active_services?.includes('car_seller') || role === 'car_seller';
    if (!hasAccess) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.blockedWrap}>
                    <View style={styles.blockedIcon}>
                        <Ionicons name="pricetag-outline" size={64} color="#7B1FA2" />
                    </View>
                    <Text style={styles.blockedTitle}>Compte vendeur requis</Text>
                    <Text style={styles.blockedDesc}>
                        Pour publier des annonces de vente automobile, vous devez compléter la vérification vendeur.
                    </Text>
                    <TouchableOpacity style={styles.blockedBtn} onPress={() => navigation.navigate('ServiceActivation', { serviceKey: 'car_seller' })}>
                        <Ionicons name="document-text" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.blockedBtnText}>Commencer la vérification</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const [listings,   setListings]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/car-listings/mine');
            setListings(res.data.listings || []);
        } catch (_) {}
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const handleListingChange = () => load();
        socketService.on('car_listing_status_changed', handleListingChange);
        return () => socketService.off('car_listing_status_changed', handleListingChange);
    }, []);

    const stats = {
        active:  listings.filter(l => l.status === 'active').length,
        pending: listings.filter(l => l.status === 'pending').length,
        sold:    listings.filter(l => l.status === 'sold').length,
        views:   listings.reduce((s, l) => s + (l.view_count || 0), 0),
    };

    const handleDelete = (id) => {
        Alert.alert('Supprimer l\'annonce', 'Cette action est irréversible.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/car-listings/${id}`);
                    setListings(prev => prev.filter(l => l.id !== id));
                } catch (e) {
                    Alert.alert('Erreur', e.response?.data?.error || 'Impossible de supprimer');
                }
            }},
        ]);
    };

    const handleTogglePause = async (item) => {
        const newStatus = item.status === 'active' ? 'paused' : 'active';
        try {
            await api.put(`/car-listings/${item.id}`, { status: newStatus });
            setListings(prev => prev.map(l => l.id === item.id ? { ...l, status: newStatus } : l));
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de modifier');
        }
    };

    const renderItem = ({ item }) => {
        const sm      = STATUS_META[item.status] || STATUS_META.active;
        const thumb   = fullUrl(item.photos?.[0]);
        return (
            <View style={styles.card}>
                {/* Photo */}
                {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.cardThumb} />
                ) : (
                    <View style={[styles.cardThumb, styles.cardThumbEmpty]}>
                        <Ionicons name="car-outline" size={32} color="#ccc" />
                    </View>
                )}

                {/* Info */}
                <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.make} {item.model} {item.year}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                            <Text style={[styles.statusLabel, { color: sm.color }]}>{sm.label}</Text>
                        </View>
                    </View>
                    <Text style={styles.cardPrice}>{fmt(item.price)} XAF</Text>
                    <View style={styles.cardMeta}>
                        {item.city && <Text style={styles.cardMetaText}>{item.city}</Text>}
                        {item.mileage && <Text style={styles.cardMetaText}>{fmt(item.mileage)} km</Text>}
                        <Text style={styles.cardMetaText}>{item.view_count || 0} vues</Text>
                    </View>
                    {/* Status notice for pending/rejected */}
                    {item.status === 'pending' && (
                        <Text style={styles.statusNotice}>
                            ⏳ En cours d'examen par notre équipe
                        </Text>
                    )}
                    {item.status === 'rejected' && (
                        <Text style={[styles.statusNotice, { color: '#C62828' }]}>
                            ✕ Annonce refusée — modifiez et republier
                        </Text>
                    )}

                    <View style={styles.cardActions}>
                        {/* Edit: allowed for all statuses */}
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('CreateCarListing', { listing: item })}
                        >
                            <Ionicons name="pencil" size={14} color="#1565C0" />
                            <Text style={[styles.actionBtnText, { color: '#1565C0' }]}>Modifier</Text>
                        </TouchableOpacity>

                        {/* Pause/Unpause: only for active listings */}
                        {item.status === 'active' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleTogglePause(item)}>
                                <Ionicons name="pause-circle-outline" size={14} color="#FFA726" />
                                <Text style={[styles.actionBtnText, { color: '#FFA726' }]}>Pause</Text>
                            </TouchableOpacity>
                        )}
                        {item.status === 'paused' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleTogglePause(item)}>
                                <Ionicons name="play-circle-outline" size={14} color="#FFA726" />
                                <Text style={[styles.actionBtnText, { color: '#FFA726' }]}>Activer</Text>
                            </TouchableOpacity>
                        )}

                        {/* Mark as sold: only for active listings */}
                        {item.status === 'active' && (
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={async () => {
                                    try {
                                        await api.put(`/car-listings/${item.id}`, { status: 'sold' });
                                        setListings(prev => prev.map(l => l.id === item.id ? { ...l, status: 'sold' } : l));
                                    } catch (_) {}
                                }}
                            >
                                <Ionicons name="checkmark-circle-outline" size={14} color="#7B1FA2" />
                                <Text style={[styles.actionBtnText, { color: '#7B1FA2' }]}>Vendu</Text>
                            </TouchableOpacity>
                        )}

                        {/* Delete */}
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={14} color="#C62828" />
                            <Text style={[styles.actionBtnText, { color: '#C62828' }]}>Suppr.</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.heading}>Mes Annonces</Text>
                    <Text style={styles.subheading}>Marché automobile Ombia</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('CreateCarListing', {})}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Publier</Text>
                </TouchableOpacity>
            </View>

            {/* Stats strip */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.active}</Text>
                    <Text style={styles.statLabel}>Active{stats.active > 1 ? 's' : ''}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftWidth: 1, borderColor: '#F0F0F0' }]}>
                    <Text style={[styles.statValue, stats.pending > 0 && { color: '#F59E0B' }]}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>En examen</Text>
                </View>
                <View style={[styles.statCard, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F0F0F0' }]}>
                    <Text style={styles.statValue}>{stats.sold}</Text>
                    <Text style={styles.statLabel}>Vendue{stats.sold > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{fmt(stats.views)}</Text>
                    <Text style={styles.statLabel}>Vues</Text>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#7B1FA2" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={listings}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#7B1FA2" />}
                    contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="pricetag-outline" size={60} color="#E0E0E0" />
                            <Text style={styles.emptyTitle}>Aucune annonce publiée</Text>
                            <Text style={styles.emptySub}>Publiez votre première annonce de véhicule dès maintenant</Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateCarListing', {})}>
                                <Text style={styles.emptyBtnText}>Créer une annonce</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    blockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    blockedIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F3E5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    blockedTitle: { fontSize: 22, fontWeight: '800', color: '#1C2E4A', marginBottom: 12, textAlign: 'center' },
    blockedDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    blockedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7B1FA2', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14, width: '100%' },
    blockedBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    heading: { fontSize: 20, fontWeight: '800', color: '#1C2E4A' },
    subheading: { fontSize: 12, color: '#aaa', marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7B1FA2', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, shadowColor: '#7B1FA2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 8 },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    statValue: { fontSize: 20, fontWeight: '800', color: '#1C2E4A' },
    statLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },

    list: { padding: 16, gap: 12 },

    card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    cardThumb: { width: 100, height: 110 },
    cardThumbEmpty: { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1, padding: 12 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1C2E4A', marginRight: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusLabel: { fontSize: 10, fontWeight: '700' },
    cardPrice: { fontSize: 15, fontWeight: '800', color: '#7B1FA2', marginBottom: 4 },
    cardMeta: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    cardMetaText: { fontSize: 10, color: '#aaa' },
    statusNotice: { fontSize: 11, color: '#F59E0B', fontStyle: 'italic', marginBottom: 6 },
    cardActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F5F5F5' },
    actionBtnText: { fontSize: 11, fontWeight: '700' },

    emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1C2E4A', marginTop: 16, marginBottom: 8 },
    emptySub: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyBtn: { backgroundColor: '#7B1FA2', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
