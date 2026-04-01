import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';

const RentalBookingScreen = ({ route, navigation }) => {
    const { car } = route.params;
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [price, setPrice] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchPrice = async () => {
        if (!startDate || !endDate) return;
        try {
            setLoadingPrice(true);
            const start = new Date(startDate.trim()).toISOString();
            const end = new Date(endDate.trim()).toISOString();
            const res = await rentalAPI.getPricePreview(car.id, start, end);
            setPrice(res.data.price);
        } catch (err) {
            setPrice(null);
            Alert.alert('Error', err.response?.data?.error || 'Could not calculate price');
        } finally { setLoadingPrice(false); }
    };

    useEffect(() => { if (startDate && endDate) fetchPrice(); }, [startDate, endDate]);

    const setQuickDuration = (hours) => {
        const now = new Date();
        const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const end = new Date(start.getTime() + hours * 3600000);
        const fmt = (d) => d.toISOString().slice(0, 16).replace('T', ' ');
        setStartDate(fmt(start));
        setEndDate(fmt(end));
    };

    const handleBook = async () => {
        if (!startDate || !endDate) { Alert.alert('Missing info', 'Please enter start and end dates'); return; }
        if (!price) { Alert.alert('Error', 'Please verify dates first'); return; }
        setSubmitting(true);
        try {
            const res = await rentalAPI.createBooking({
                rental_car_id: car.id,
                requested_start: new Date(startDate.trim()).toISOString(),
                requested_end: new Date(endDate.trim()).toISOString(),
                notes
            });
            Alert.alert('Request Sent!', 'Your booking request has been sent to the owner. You will be notified once they respond.', [
                { text: 'View Booking', onPress: () => navigation.navigate('RentalBookingStatus', { bookingId: res.data.booking.id }) }
            ]);
        } catch (err) {
            Alert.alert('Booking Failed', err.response?.data?.error || 'Failed to send booking request');
        } finally { setSubmitting(false); }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Book Car</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.carSummary}>
                    <Ionicons name="car" size={32} color={COLORS.info} />
                    <View style={styles.carSummaryInfo}>
                        <Text style={styles.carName}>{car.make} {car.model} {car.year}</Text>
                        <Text style={styles.carMeta}>{car.color} · {car.fuel_type}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Quick Duration</Text>
                <View style={styles.quickRow}>
                    {[['2h', 2], ['4h', 4], ['8h', 8], ['1d', 24], ['3d', 72]].map(([label, h]) => (
                        <TouchableOpacity key={label} style={styles.quickBtn} onPress={() => setQuickDuration(h)}>
                            <Text style={styles.quickBtnText}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Select Dates</Text>
                <Text style={styles.hint}>Format: YYYY-MM-DD HH:MM</Text>
                <View style={styles.field}>
                    <Text style={styles.label}>Start Date & Time *</Text>
                    <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-03-01 10:00" onBlur={fetchPrice} />
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>End Date & Time *</Text>
                    <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-03-02 10:00" onBlur={fetchPrice} />
                </View>

                {loadingPrice && <ActivityIndicator style={{ marginVertical: SPACING.md }} color={COLORS.info} />}

                {price && (
                    <View style={styles.priceBreakdown}>
                        <Text style={styles.sectionTitle}>Price Breakdown</Text>
                        {[
                            ['Duration', price.totalHours + ' hours'],
                            ['Base Price', '$' + price.basePrice],
                            ['Platform Fee (10%)', '$' + price.platformFee],
                            ['Deposit (refundable)', '$' + price.depositAmount],
                        ].map(([label, val]) => (
                            <View key={label} style={styles.priceRow}>
                                <Text style={styles.priceLabel}>{label}</Text>
                                <Text style={styles.priceVal}>{val}</Text>
                            </View>
                        ))}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Charged</Text>
                            <Text style={styles.totalVal}>${price.totalCharged}</Text>
                        </View>
                        <Text style={styles.ownerNote}>Owner earns ${price.ownerEarnings}</Text>
                    </View>
                )}

                <View style={styles.field}>
                    <Text style={styles.label}>Message to Owner (optional)</Text>
                    <TextInput style={[styles.input, styles.textarea]} value={notes} onChangeText={setNotes} placeholder="Any special requests or questions..." multiline numberOfLines={3} />
                </View>

                <TouchableOpacity style={[styles.bookBtn, submitting && styles.disabled]} onPress={handleBook} disabled={submitting}>
                    <Text style={styles.bookBtnText}>{submitting ? 'Sending Request...' : 'Send Booking Request'}</Text>
                </TouchableOpacity>
                <Text style={styles.disclaimer}>Your booking is not confirmed until the owner approves it. You will receive a notification.</Text>
                <View style={{ height: 32 }} />
            </ScrollView></KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    scroll: { flex: 1 },
    carSummary: { flexDirection: 'row', alignItems: 'center', margin: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.gray50, borderRadius: BORDER_RADIUS.lg },
    carSummaryInfo: { marginLeft: SPACING.md },
    carName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
    carMeta: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm },
    hint: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    quickRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    quickBtn: { borderWidth: 1, borderColor: COLORS.info, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
    quickBtnText: { color: COLORS.info, fontWeight: '600', fontSize: FONT_SIZES.sm },
    field: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    label: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
    textarea: { height: 80, textAlignVertical: 'top' },
    priceBreakdown: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.gray50, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    priceLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    priceVal: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8 },
    totalLabel: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
    totalVal: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.info },
    ownerNote: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4, textAlign: 'right' },
    bookBtn: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    bookBtnText: { color: COLORS.secondary, fontWeight: '700', fontSize: FONT_SIZES.md },
    disclaimer: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center', margin: SPACING.md },
});

export default RentalBookingScreen;
