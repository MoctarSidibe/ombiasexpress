import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../../components/LeafletMap';
import { rentalAPI } from '../../services/api.service';

const ORANGE = '#FFA726';
const NAVY   = '#1C2E4A';
const BLUE   = '#0288D1';

const fmt = n => Number(n || 0).toLocaleString('fr-FR');

const RentalCarDetailScreen = ({ route, navigation }) => {
    const { carId } = route.params;
    const insets = useSafeAreaInsets();
    const [car, setCar] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        rentalAPI.getCarById(carId)
            .then(r => setCar(r.data.car))
            .catch(() => Alert.alert('Erreur', 'Impossible de charger le véhicule'))
            .finally(() => setLoading(false));
    }, [carId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={ORANGE} />
            </View>
        );
    }
    if (!car) {
        return (
            <View style={styles.center}>
                <Ionicons name="car-outline" size={48} color="#D1D5DB" />
                <Text style={styles.notFoundText}>Véhicule introuvable</Text>
            </View>
        );
    }

    const features = Array.isArray(car.features) ? car.features : [];
    const photos   = Array.isArray(car.photos) ? car.photos : [];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={20} color={NAVY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {car.make} {car.model}
                </Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Photos ── */}
                {photos.length > 0 ? (
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        style={styles.photoScroll}
                    >
                        {photos.map((url, i) => (
                            <Image key={i} source={{ uri: url }} style={styles.photo} resizeMode="cover" />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.photoPlaceholder}>
                        <Ionicons name="car" size={64} color={ORANGE} />
                        <Text style={styles.photoPlaceholderText}>{car.color} {car.make} {car.model}</Text>
                    </View>
                )}

                {/* ── Title block ── */}
                <View style={styles.titleBlock}>
                    <View style={styles.titleRow}>
                        <Text style={styles.carTitle}>{car.year} {car.make} {car.model}</Text>
                        <View style={styles.seatsPill}>
                            <Ionicons name="people-outline" size={13} color={NAVY} />
                            <Text style={styles.seatsText}>{car.seats} places</Text>
                        </View>
                    </View>
                    <Text style={styles.carMeta}>
                        {car.color}  ·  {car.fuel_type}  ·  {car.license_plate}
                    </Text>
                </View>

                {/* ── Price cards ── */}
                <View style={styles.priceRow}>
                    <View style={[styles.priceCard, { borderColor: '#FFE0B2' }]}>
                        <Text style={styles.priceCardLabel}>Par heure</Text>
                        <Text style={[styles.priceCardValue, { color: ORANGE }]}>
                            {fmt(car.price_per_hour)}
                        </Text>
                        <Text style={styles.priceCardCurrency}>XAF</Text>
                    </View>
                    <View style={[styles.priceCard, { borderColor: '#B3E5FC' }]}>
                        <Text style={styles.priceCardLabel}>Par jour</Text>
                        <Text style={[styles.priceCardValue, { color: BLUE }]}>
                            {fmt(car.price_per_day)}
                        </Text>
                        <Text style={[styles.priceCardCurrency, { color: BLUE }]}>XAF</Text>
                    </View>
                    <View style={[styles.priceCard, { borderColor: '#C8E6C9' }]}>
                        <Text style={styles.priceCardLabel}>Caution</Text>
                        <Text style={[styles.priceCardValue, { color: '#2E7D32' }]}>
                            {fmt(car.deposit_amount)}
                        </Text>
                        <Text style={[styles.priceCardCurrency, { color: '#2E7D32' }]}>XAF</Text>
                    </View>
                </View>

                {/* ── Features ── */}
                {features.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Équipements</Text>
                        <View style={styles.featuresWrap}>
                            {features.map(f => (
                                <View key={f} style={styles.featureChip}>
                                    <Ionicons name="checkmark-circle" size={13} color={ORANGE} />
                                    <Text style={styles.featureText}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Pickup location ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Point de retrait</Text>
                    <View style={styles.mapSmall}>
                        <LeafletMap
                            style={{ flex: 1 }}
                            initialRegion={{
                                latitude:  parseFloat(car.pickup_lat),
                                longitude: parseFloat(car.pickup_lng),
                                latitudeDelta:  0.005,
                                longitudeDelta: 0.005,
                            }}
                            markers={[{
                                id: 'car',
                                coordinate: { latitude: parseFloat(car.pickup_lat), longitude: parseFloat(car.pickup_lng) },
                                type: 'car',
                            }]}
                        />
                    </View>
                    <View style={styles.addressRow}>
                        <Ionicons name="location-outline" size={15} color={ORANGE} />
                        <Text style={styles.addressText}>{car.pickup_address}</Text>
                    </View>
                    {car.pickup_instructions && (
                        <Text style={styles.instructions}>{car.pickup_instructions}</Text>
                    )}
                </View>

                {/* ── Owner ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Propriétaire</Text>
                    <View style={styles.ownerRow}>
                        <View style={styles.ownerAvatar}>
                            <Ionicons name="person" size={24} color="#9AA3B0" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.ownerName}>{car.owner?.name || '—'}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={13} color="#FFD700" />
                                <Text style={styles.ratingText}>
                                    {parseFloat(car.owner?.rating || 5).toFixed(1)} / 5
                                </Text>
                            </View>
                        </View>
                        <View style={styles.ownerBadge}>
                            <Ionicons name="shield-checkmark" size={13} color="#2E7D32" />
                            <Text style={styles.ownerBadgeText}>Vérifié</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ── Footer ── */}
            <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
                <View style={styles.footerPriceBlock}>
                    <Text style={styles.footerLabel}>À partir de</Text>
                    <View style={styles.footerPriceRow}>
                        <Text style={styles.footerPrice}>{fmt(car.price_per_hour)}</Text>
                        <Text style={styles.footerPriceUnit}> XAF/h</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => navigation.navigate('RentalBooking', { car })}
                >
                    <Ionicons name="calendar-outline" size={18} color="#fff" />
                    <Text style={styles.bookBtnText}>Réserver</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FB' },
    notFoundText: { fontSize: 15, color: '#9AA3B0', marginTop: 12 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#F5F6FA', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: NAVY, flex: 1, textAlign: 'center' },

    // Photos
    scroll: { flex: 1 },
    photoScroll: { height: 220 },
    photo: { width: 320, height: 220 },
    photoPlaceholder: {
        height: 200, backgroundColor: '#FFF8EE',
        alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    photoPlaceholderText: { fontSize: 13, color: '#9AA3B0' },

    // Title
    titleBlock: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    carTitle: { fontSize: 18, fontWeight: '800', color: NAVY, flex: 1 },
    seatsPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#F0F4FF', borderRadius: 12,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    seatsText: { fontSize: 12, fontWeight: '700', color: NAVY },
    carMeta: { fontSize: 13, color: '#9AA3B0' },

    // Prices
    priceRow: {
        flexDirection: 'row', gap: 10,
        paddingHorizontal: 16, paddingVertical: 16,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    priceCard: {
        flex: 1, alignItems: 'center', paddingVertical: 12,
        borderRadius: 14, borderWidth: 1.5,
        backgroundColor: '#FAFAFA',
    },
    priceCardLabel: { fontSize: 10, fontWeight: '700', color: '#9AA3B0', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
    priceCardValue: { fontSize: 16, fontWeight: '800', color: ORANGE },
    priceCardCurrency: { fontSize: 10, fontWeight: '600', color: '#E65100', marginTop: 2 },

    // Section
    section: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginTop: 8 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: NAVY, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 },

    // Features
    featuresWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    featureChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#FFF8EE', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: '#FFE0B2',
    },
    featureText: { fontSize: 12, fontWeight: '600', color: NAVY },

    // Map
    mapSmall: { height: 150, borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
    addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    addressText: { flex: 1, fontSize: 13, fontWeight: '600', color: NAVY },
    instructions: { fontSize: 12, color: '#9AA3B0', marginTop: 6, fontStyle: 'italic' },

    // Owner
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ownerAvatar: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#E8EAF0',
    },
    ownerName: { fontSize: 14, fontWeight: '700', color: NAVY },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    ratingText: { fontSize: 12, color: '#6B7280' },
    ownerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#E8F5E9', borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    ownerBadgeText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },

    // Footer
    footer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
    },
    footerPriceBlock: {},
    footerLabel: { fontSize: 11, color: '#9AA3B0', fontWeight: '500' },
    footerPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
    footerPrice: { fontSize: 22, fontWeight: '900', color: ORANGE },
    footerPriceUnit: { fontSize: 12, fontWeight: '600', color: '#E65100' },
    bookBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: ORANGE, borderRadius: 14,
        paddingVertical: 14, paddingHorizontal: 28,
        shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
    },
    bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default RentalCarDetailScreen;
