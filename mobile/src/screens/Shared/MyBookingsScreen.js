import { API_BASE } from '../../services/api.service';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { rentalAPI } from '../../services/api.service';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';


const STATUS_CONFIG = {
    pending:   { label: 'En attente',  color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline' },
    approved:  { label: 'Approuvée',   color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
    active:    { label: 'En cours',    color: '#3B82F6', bg: '#DBEAFE', icon: 'car-outline' },
    completed: { label: 'Terminée',    color: '#6B7280', bg: '#F3F4F6', icon: 'checkmark-done-outline' },
    cancelled: { label: 'Annulée',     color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle-outline' },
    rejected:  { label: 'Refusée',     color: '#EF4444', bg: '#FEE2E2', icon: 'ban-outline' },
};

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function MyBookingsScreen() {
    const navigation = useNavigation();
    const [bookings, setBookings]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await rentalAPI.getMyBookings();
            setBookings(res.data?.bookings || res.data || []);
        } catch (_) {}
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const renderBooking = ({ item: b }) => {
        const car = b.rentalCar || b.car || {};
        const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
        const photos = car.photos || [];
        const thumb = photos[0]
            ? (photos[0].startsWith('http') ? photos[0] : `${API_BASE}${photos[0]}`)
            : null;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('RentalBookingStatus', { bookingId: b.id })}
                activeOpacity={0.85}
            >
                <View style={styles.cardRow}>
                    {thumb
                        ? <Image source={{ uri: thumb }} style={styles.thumb} />
                        : <View style={[styles.thumb, styles.thumbPlaceholder]}>
                            <Ionicons name="car-outline" size={28} color="#ccc" />
                          </View>
                    }
                    <View style={styles.cardInfo}>
                        <Text style={styles.carName} numberOfLines={1}>
                            {car.make || '—'} {car.model || ''}
                        </Text>
                        <Text style={styles.dateRange}>
                            {formatDate(b.start_date)} → {formatDate(b.end_date)}
                        </Text>
                        <Text style={styles.price}>{fmt(b.total_price)} XAF</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                </View>

                {b.status === 'pending' && (
                    <View style={styles.pendingNote}>
                        <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                        <Text style={styles.pendingNoteText}>En attente de confirmation du propriétaire</Text>
                    </View>
                )}
                {b.rejection_reason && (
                    <View style={styles.pendingNote}>
                        <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                        <Text style={[styles.pendingNoteText, { color: '#EF4444' }]}>
                            Motif : {b.rejection_reason}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Mes réservations</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(b) => b.id}
                    renderItem={renderBooking}
                    contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>Aucune réservation</Text>
                            <Text style={styles.emptyText}>Vos réservations de véhicules apparaîtront ici</Text>
                            <TouchableOpacity
                                style={styles.browseBtn}
                                onPress={() => navigation.navigate('RentalMap')}
                            >
                                <Text style={styles.browseBtnText}>Parcourir les véhicules</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backBtn:    { width: 40, height: 40, justifyContent: 'center' },
    title:      { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
    center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list:       { padding: SPACING.md, paddingBottom: 100 },
    emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },

    card: {
        backgroundColor: '#fff',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    thumb: {
        width: 72,
        height: 56,
        borderRadius: 8,
    },
    thumbPlaceholder: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo:   { flex: 1 },
    carName:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
    dateRange:  { fontSize: 12, color: '#6B7280', marginBottom: 2 },
    price:      { fontSize: 13, fontWeight: '700', color: COLORS.primary },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    badgeText:  { fontSize: 11, fontWeight: '700' },

    pendingNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    pendingNoteText: { fontSize: 12, color: '#92400E', flex: 1 },

    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
    emptyText:  { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
    browseBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
