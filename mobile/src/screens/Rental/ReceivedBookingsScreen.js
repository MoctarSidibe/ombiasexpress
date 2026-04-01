import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';
import socketService from '../../services/socket.service';

const ReceivedBookingsScreen = ({ navigation }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionId, setActionId] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await rentalAPI.getReceivedBookings();
            setBookings(res.data?.bookings || []);
        } catch (_) {} finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        socketService.on('rental_booking_request',   load);
        socketService.on('rental_booking_cancelled', load);
        return () => {
            socketService.off('rental_booking_request',   load);
            socketService.off('rental_booking_cancelled', load);
        };
    }, [load]);

    const handleApprove = async (bookingId) => {
        setActionId(bookingId);
        try { await rentalAPI.approveBooking(bookingId); load(); }
        catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to approve'); }
        finally { setActionId(null); }
    };

    const handleReject = (bookingId) => {
        Alert.alert('Reject Booking', 'Why are you rejecting this booking?', [
            { text: 'Cancel' },
            { text: 'Car unavailable', onPress: () => doReject(bookingId, 'Car unavailable during this period') },
            { text: 'Other reason', onPress: () => doReject(bookingId, 'Owner declined the request') }
        ]);
    };

    const doReject = async (bookingId, reason) => {
        setActionId(bookingId);
        try { await rentalAPI.rejectBooking(bookingId, reason); load(); }
        catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to reject'); }
        finally { setActionId(null); }
    };

    const handleStart = async (bookingId) => {
        Alert.alert('Hand Over Car', 'Has the renter picked up the car?', [
            { text: 'Cancel' },
            { text: 'Yes, Start Rental', onPress: async () => {
                setActionId(bookingId);
                try { await rentalAPI.startBooking(bookingId); load(); }
                catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to start'); }
                finally { setActionId(null); }
            }}
        ]);
    };

    const handleComplete = async (bookingId) => {
        Alert.alert('Complete Rental', 'Has the renter returned the car?', [
            { text: 'Cancel' },
            { text: 'Yes, Car Returned', onPress: async () => {
                setActionId(bookingId);
                try { await rentalAPI.completeBooking(bookingId); load(); }
                catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to complete'); }
                finally { setActionId(null); }
            }}
        ]);
    };

    const renderItem = ({ item: b }) => {
        const isActing = actionId === b.id;
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={styles.carInfo}>
                        <Text style={styles.carName}>{b.rentalCar?.make} {b.rentalCar?.model}</Text>
                        <Text style={styles.renterName}>Renter: {b.renter?.name}</Text>
                        <Text style={styles.renterPhone}>{b.renter?.phone} ⭐{parseFloat(b.renter?.rating || 5).toFixed(1)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: b.status === 'requested' ? COLORS.warning + '20' : COLORS.info + '20' }]}>
                        <Text style={[styles.badgeText, { color: b.status === 'requested' ? COLORS.warning : COLORS.info }]}>{b.status}</Text>
                    </View>
                </View>
                <View style={styles.dateSection}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.dateText}> {new Date(b.requested_start).toLocaleString()} → {new Date(b.requested_end).toLocaleString()}</Text>
                </View>
                <View style={styles.priceSection}>
                    <Text style={styles.priceText}>
                        {b.total_hours}h · {Number(b.total_charged).toLocaleString('fr-FR')} XAF · Gain : {Number(b.owner_earnings).toLocaleString('fr-FR')} XAF
                    </Text>
                </View>
                {b.notes ? <Text style={styles.notes}>"{b.notes}"</Text> : null}

                {b.status === 'requested' && !isActing && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(b.id)}>
                            <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(b.id)}>
                            <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {b.status === 'approved' && !isActing && (
                    <TouchableOpacity style={styles.startBtn} onPress={() => handleStart(b.id)}>
                        <Ionicons name="key" size={16} color={COLORS.secondary} />
                        <Text style={styles.startBtnText}>Hand Over Car</Text>
                    </TouchableOpacity>
                )}
                {b.status === 'active' && !isActing && (
                    <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(b.id)}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.secondary} />
                        <Text style={styles.completeBtnText}>Mark Car Returned</Text>
                    </TouchableOpacity>
                )}
                {isActing && <ActivityIndicator style={{ marginTop: SPACING.sm }} color={COLORS.info} />}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rental Requests</Text>
                <TouchableOpacity onPress={() => { setLoading(true); load(); }}>
                    <Ionicons name="refresh" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>
            {loading ? <ActivityIndicator style={{ flex: 1 }} color={COLORS.info} /> : (
                <FlatList
                    data={bookings}
                    renderItem={renderItem}
                    keyExtractor={b => b.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                    ListEmptyComponent={<View style={styles.empty}><Ionicons name="mail-outline" size={48} color={COLORS.gray300} /><Text style={styles.emptyText}>No booking requests yet</Text></View>}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    list: { padding: SPACING.md },
    card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
    carInfo: { flex: 1 },
    carName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
    renterName: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    renterPhone: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    badge: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, height: 26 },
    badgeText: { fontSize: FONT_SIZES.xs, fontWeight: '700', textTransform: 'capitalize' },
    dateSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    dateText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    priceSection: { marginBottom: 4 },
    priceText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
    notes: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: SPACING.sm },
    actionRow: { flexDirection: 'row', marginTop: SPACING.sm },
    rejectBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.error, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, alignItems: 'center', marginRight: SPACING.sm },
    rejectBtnText: { color: COLORS.error, fontWeight: '700', fontSize: FONT_SIZES.sm },
    approveBtn: { flex: 1, backgroundColor: COLORS.success, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
    approveBtnText: { color: COLORS.secondary, fontWeight: '700', fontSize: FONT_SIZES.sm },
    startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.info, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm },
    startBtnText: { color: COLORS.secondary, fontWeight: '700', marginLeft: 6, fontSize: FONT_SIZES.sm },
    completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm },
    completeBtnText: { color: COLORS.secondary, fontWeight: '700', marginLeft: 6, fontSize: FONT_SIZES.sm },
    empty: { alignItems: 'center', padding: SPACING.xxl },
    emptyText: { color: COLORS.textSecondary, marginTop: SPACING.md, fontSize: FONT_SIZES.md },
});

export default ReceivedBookingsScreen;
