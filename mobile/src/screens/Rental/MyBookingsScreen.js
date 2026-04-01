import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';
import socketService from '../../services/socket.service';

const STATUS_COLORS = { requested: COLORS.warning, approved: COLORS.info, active: COLORS.success, completed: COLORS.gray400, rejected: COLORS.error, cancelled: COLORS.error, disputed: COLORS.warning };
const TABS = ['active', 'upcoming', 'past'];

const MyBookingsScreen = ({ navigation }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState('active');

    const load = useCallback(async () => {
        try {
            const res = await rentalAPI.getMyBookings();
            setBookings(res.data?.bookings || []);
        } catch (_) {} finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        // Refresh when owner approves/rejects/starts/completes our booking
        socketService.on('rental_booking_approved', load);
        socketService.on('rental_booking_rejected', load);
        socketService.on('rental_started',          load);
        socketService.on('rental_completed',        load);
        return () => {
            socketService.off('rental_booking_approved', load);
            socketService.off('rental_booking_rejected', load);
            socketService.off('rental_started',          load);
            socketService.off('rental_completed',        load);
        };
    }, [load]);

    const filtered = bookings.filter(b => {
        if (tab === 'active') return ['requested', 'approved', 'active'].includes(b.status);
        if (tab === 'upcoming') return b.status === 'approved' && new Date(b.confirmed_start) > new Date();
        return ['completed', 'rejected', 'cancelled'].includes(b.status);
    });

    const renderItem = ({ item: b }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RentalBookingStatus', { bookingId: b.id })}>
            <View style={styles.cardHeader}>
                <View style={styles.carIcon}><Ionicons name="car" size={24} color={COLORS.info} /></View>
                <View style={styles.carInfo}>
                    <Text style={styles.carName}>{b.rentalCar?.make} {b.rentalCar?.model} {b.rentalCar?.year}</Text>
                    <Text style={styles.carColor}>{b.rentalCar?.color}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[b.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[b.status] }]}>{b.status}</Text>
                </View>
            </View>
            <View style={styles.dateRow}>
                <Ionicons name="calendar" size={14} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>{new Date(b.requested_start).toLocaleDateString()} → {new Date(b.requested_end).toLocaleDateString()}</Text>
            </View>
            <View style={styles.priceRow}>
                <Text style={styles.hours}>{b.total_hours}h</Text>
                <Text style={styles.price}>{Number(b.total_charged).toLocaleString('fr-FR')} XAF</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabs}>
                {TABS.map(t => (
                    <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? <ActivityIndicator style={{ flex: 1 }} color={COLORS.info} /> : (
                <FlatList
                    data={filtered}
                    renderItem={renderItem}
                    keyExtractor={b => b.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                    ListEmptyComponent={<View style={styles.empty}><Ionicons name="car-outline" size={48} color={COLORS.gray300} /><Text style={styles.emptyText}>No {tab} bookings</Text></View>}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tab: { flex: 1, padding: SPACING.md, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.info },
    tabText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },
    tabTextActive: { color: COLORS.info },
    list: { padding: SPACING.md },
    card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
    carIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.gray50, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
    carInfo: { flex: 1 },
    carName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
    carColor: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    statusBadge: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: FONT_SIZES.xs, fontWeight: '700', textTransform: 'capitalize' },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    dateText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginLeft: 4 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    hours: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    price: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.info },
    empty: { alignItems: 'center', padding: SPACING.xxl },
    emptyText: { color: COLORS.textSecondary, marginTop: SPACING.md, fontSize: FONT_SIZES.md },
});

export default MyBookingsScreen;
