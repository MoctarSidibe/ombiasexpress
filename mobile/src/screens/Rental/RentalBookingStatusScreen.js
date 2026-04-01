import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';
import socketService from '../../services/socket.service';

const STATUS_STEPS = ['requested', 'approved', 'active', 'completed'];
const STATUS_LABELS = { requested: 'Pending', approved: 'Approved', active: 'Active', completed: 'Done', rejected: 'Rejected', cancelled: 'Cancelled', disputed: 'Disputed' };
const STATUS_COLORS = { requested: COLORS.warning, approved: COLORS.info, active: COLORS.success, completed: COLORS.success, rejected: COLORS.error, cancelled: COLORS.error, disputed: COLORS.warning };

const RentalBookingStatusScreen = ({ route, navigation }) => {
    const { bookingId } = route.params;
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const loadBooking = async () => {
        try {
            const res = await rentalAPI.getBookingById(bookingId);
            setBooking(res.data.booking);
        } catch (_) {} finally { setLoading(false); }
    };

    useEffect(() => {
        loadBooking();
        socketService.on('rental_booking_approved', (data) => { if (data.bookingId === bookingId) loadBooking(); });
        socketService.on('rental_booking_rejected', (data) => { if (data.bookingId === bookingId) loadBooking(); });
        socketService.on('rental_started', (data) => { if (data.bookingId === bookingId) loadBooking(); });
        socketService.on('rental_completed', (data) => { if (data.bookingId === bookingId) loadBooking(); });
        return () => { ['rental_booking_approved', 'rental_booking_rejected', 'rental_started', 'rental_completed'].forEach(e => socketService.off(e)); };
    }, [bookingId]);

    const handleCancel = () => {
        Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
            { text: 'No' },
            { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
                setActionLoading(true);
                try { await rentalAPI.cancelBooking(bookingId, 'Cancelled by renter'); loadBooking(); }
                catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to cancel'); }
                finally { setActionLoading(false); }
            }}
        ]);
    };

    const handleRate = () => navigation.navigate('RentalRating', { booking });

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.info} /></View>;
    if (!booking) return <View style={styles.center}><Text>Booking not found</Text></View>;

    const statusColor = STATUS_COLORS[booking.status] || COLORS.gray400;
    const car = booking.rentalCar;
    const owner = booking.owner;
    const stepIdx = STATUS_STEPS.indexOf(booking.status);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Status</Text>
                <TouchableOpacity onPress={loadBooking}>
                    <Ionicons name="refresh" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[booking.status]}</Text>
                </View>

                {['requested', 'approved', 'active'].includes(booking.status) && (
                    <View style={styles.progressRow}>
                        {STATUS_STEPS.slice(0, 4).map((step, i) => (
                            <React.Fragment key={step}>
                                <View style={[styles.step, i <= stepIdx && styles.stepActive]}>
                                    <Text style={[styles.stepText, i <= stepIdx && styles.stepTextActive]}>{i + 1}</Text>
                                </View>
                                {i < 3 && <View style={[styles.stepLine, i < stepIdx && styles.stepLineActive]} />}
                            </React.Fragment>
                        ))}
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{car?.make} {car?.model} {car?.year}</Text>
                    <Text style={styles.cardMeta}>{car?.color}</Text>
                    <View style={styles.divider} />
                    <View style={styles.row}><Text style={styles.rowLabel}>Start</Text><Text style={styles.rowVal}>{new Date(booking.requested_start).toLocaleString()}</Text></View>
                    <View style={styles.row}><Text style={styles.rowLabel}>End</Text><Text style={styles.rowVal}>{new Date(booking.requested_end).toLocaleString()}</Text></View>
                    <View style={styles.row}><Text style={styles.rowLabel}>Duration</Text><Text style={styles.rowVal}>{booking.total_hours}h</Text></View>
                    <View style={styles.divider} />
                    <View style={styles.row}><Text style={styles.rowLabel}>Base Price</Text><Text style={styles.rowVal}>${booking.base_price}</Text></View>
                    <View style={styles.row}><Text style={styles.rowLabel}>Deposit</Text><Text style={styles.rowVal}>${booking.deposit_amount}</Text></View>
                    <View style={styles.row}><Text style={styles.rowLabelBold}>Total</Text><Text style={styles.rowValBold}>${booking.total_charged}</Text></View>
                </View>

                {booking.status === 'approved' && (
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={20} color={COLORS.info} />
                        <View style={styles.infoText}>
                            <Text style={styles.infoTitle}>Pickup Info</Text>
                            <Text style={styles.infoBody}>{car?.pickup_address}</Text>
                            {car?.pickup_instructions && <Text style={styles.infoInstructions}>{car.pickup_instructions}</Text>}
                        </View>
                    </View>
                )}

                {owner && booking.status !== 'rejected' && booking.status !== 'cancelled' && (
                    <View style={styles.ownerCard}>
                        <Text style={styles.ownerLabel}>Owner</Text>
                        <Text style={styles.ownerName}>{owner.name}</Text>
                        <Text style={styles.ownerPhone}>{owner.phone}</Text>
                    </View>
                )}

                {['requested', 'approved'].includes(booking.status) && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={actionLoading}>
                        <Text style={styles.cancelBtnText}>{actionLoading ? 'Cancelling...' : 'Cancel Booking'}</Text>
                    </TouchableOpacity>
                )}

                {booking.status === 'completed' && !booking.owner_rating && (
                    <TouchableOpacity style={styles.rateBtn} onPress={handleRate}>
                        <Ionicons name="star" size={18} color={COLORS.secondary} />
                        <Text style={styles.rateBtnText}>Rate this rental</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    scroll: { flex: 1, padding: SPACING.lg },
    statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 6, marginBottom: SPACING.md },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontWeight: '700', fontSize: FONT_SIZES.sm },
    progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
    step: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
    stepActive: { backgroundColor: COLORS.info },
    stepText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary },
    stepTextActive: { color: COLORS.secondary },
    stepLine: { flex: 1, height: 2, backgroundColor: COLORS.gray100 },
    stepLineActive: { backgroundColor: COLORS.info },
    card: { backgroundColor: COLORS.gray50, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
    cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
    cardMeta: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
    rowLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    rowVal: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
    rowLabelBold: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
    rowValBold: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.info },
    infoCard: { flexDirection: 'row', backgroundColor: COLORS.info + '15', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
    infoText: { flex: 1, marginLeft: SPACING.sm },
    infoTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.info },
    infoBody: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginTop: 2 },
    infoInstructions: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
    ownerCard: { backgroundColor: COLORS.gray50, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
    ownerLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    ownerName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
    ownerPhone: { fontSize: FONT_SIZES.sm, color: COLORS.info },
    cancelBtn: { borderWidth: 1, borderColor: COLORS.error, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md },
    cancelBtnText: { color: COLORS.error, fontWeight: '700', fontSize: FONT_SIZES.md },
    rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.warning, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
    rateBtnText: { color: COLORS.secondary, fontWeight: '700', fontSize: FONT_SIZES.md, marginLeft: 6 },
});

export default RentalBookingStatusScreen;
