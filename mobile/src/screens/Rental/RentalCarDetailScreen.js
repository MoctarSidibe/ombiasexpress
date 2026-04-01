import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';

const RentalCarDetailScreen = ({ route, navigation }) => {
    const { carId } = route.params;
    const [car, setCar] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        rentalAPI.getCarById(carId).then(r => setCar(r.data.car)).catch(() => Alert.alert('Error', 'Failed to load car')).finally(() => setLoading(false));
    }, [carId]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.info} /></View>;
    if (!car) return <View style={styles.center}><Text>Car not found</Text></View>;

    const features = Array.isArray(car.features) ? car.features : [];
    const photos = Array.isArray(car.photos) ? car.photos : [];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{car.make} {car.model}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scroll}>
                {photos.length > 0 ? (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                        {photos.map((url, i) => <Image key={i} source={{ uri: url }} style={styles.photo} resizeMode="cover" />)}
                    </ScrollView>
                ) : (
                    <View style={styles.photoPlaceholder}>
                        <Ionicons name="car" size={64} color={COLORS.info} />
                        <Text style={styles.placeholderText}>{car.color} {car.make} {car.model}</Text>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.carTitle}>{car.year} {car.make} {car.model}</Text>
                    <Text style={styles.carMeta}>{car.color} · {car.seats} seats · {car.fuel_type}</Text>
                    <Text style={styles.plate}>Plate: {car.license_plate}</Text>
                </View>

                <View style={styles.priceCard}>
                    <View style={styles.priceItem}>
                        <Text style={styles.priceValue}>${parseFloat(car.price_per_hour).toFixed(2)}</Text>
                        <Text style={styles.priceLabel}>/ hour</Text>
                    </View>
                    <View style={styles.priceDivider} />
                    <View style={styles.priceItem}>
                        <Text style={styles.priceValue}>${parseFloat(car.price_per_day).toFixed(2)}</Text>
                        <Text style={styles.priceLabel}>/ day</Text>
                    </View>
                    <View style={styles.priceDivider} />
                    <View style={styles.priceItem}>
                        <Text style={styles.priceValue}>${parseFloat(car.deposit_amount).toFixed(2)}</Text>
                        <Text style={styles.priceLabel}>deposit</Text>
                    </View>
                </View>

                {features.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Features</Text>
                        <View style={styles.featureRow}>
                            {features.map(f => (
                                <View key={f} style={styles.featureChip}>
                                    <Ionicons name="checkmark-circle" size={14} color={COLORS.info} />
                                    <Text style={styles.featureText}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pickup Location</Text>
                    <View style={styles.mapSmall}>
                        <MapView
                            style={{ flex: 1 }}
                            initialRegion={{ latitude: parseFloat(car.pickup_lat), longitude: parseFloat(car.pickup_lng), latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                            scrollEnabled={false} zoomEnabled={false}
                        >
                            <Marker coordinate={{ latitude: parseFloat(car.pickup_lat), longitude: parseFloat(car.pickup_lng) }}>
                                <View style={styles.mapMarker}><Ionicons name="car" size={16} color={COLORS.secondary} /></View>
                            </Marker>
                        </MapView>
                    </View>
                    <Text style={styles.address}>{car.pickup_address}</Text>
                    {car.pickup_instructions && <Text style={styles.instructions}>{car.pickup_instructions}</Text>}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Owner</Text>
                    <View style={styles.ownerRow}>
                        <View style={styles.ownerAvatar}><Ionicons name="person" size={28} color={COLORS.textSecondary} /></View>
                        <View>
                            <Text style={styles.ownerName}>{car.owner?.name}</Text>
                            <Text style={styles.ownerRating}>⭐ {parseFloat(car.owner?.rating || 5).toFixed(1)} rating</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerPrice}>
                    <Text style={styles.footerPriceLabel}>Starting from</Text>
                    <Text style={styles.footerPriceValue}>${parseFloat(car.price_per_hour).toFixed(2)}/hr</Text>
                </View>
                <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('RentalBooking', { car })}>
                    <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    scroll: { flex: 1 },
    photoScroll: { height: 220 },
    photo: { width: 300, height: 220 },
    photoPlaceholder: { height: 200, backgroundColor: COLORS.gray50, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { color: COLORS.textSecondary, marginTop: SPACING.sm, fontSize: FONT_SIZES.sm },
    section: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
    carTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.textPrimary },
    carMeta: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
    plate: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
    priceCard: { flexDirection: 'row', margin: SPACING.lg, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.gray50, ...SHADOWS.sm },
    priceItem: { flex: 1, alignItems: 'center', padding: SPACING.md },
    priceValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.info },
    priceLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    priceDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
    featureRow: { flexDirection: 'row', flexWrap: 'wrap' },
    featureChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray50, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8, marginBottom: 8 },
    featureText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginLeft: 4 },
    mapSmall: { height: 150, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.sm },
    mapMarker: { backgroundColor: COLORS.info, borderRadius: BORDER_RADIUS.full, padding: 6 },
    address: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600' },
    instructions: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
    ownerRow: { flexDirection: 'row', alignItems: 'center' },
    ownerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
    ownerName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
    ownerRating: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
    footerPrice: {},
    footerPriceLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    footerPriceValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.info },
    bookBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl },
    bookBtnText: { color: COLORS.secondary, fontSize: FONT_SIZES.md, fontWeight: '700' },
});

export default RentalCarDetailScreen;
