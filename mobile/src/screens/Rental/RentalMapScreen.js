import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../../components/LeafletMap';
import { SHADOWS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';
import socketService from '../../services/socket.service';
import locationService from '../../services/location.service';

const ORANGE = '#FFA726';
const NAVY   = '#1C2E4A';
const BLUE   = '#0288D1';

const RentalMapScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [cars,         setCars]         = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [selectedCar,  setSelectedCar]  = useState(null);
    const [showFilters,  setShowFilters]  = useState(false);
    const [filters,      setFilters]      = useState({ min_seats: '', max_price_per_day: '', fuel_type: '' });
    const [mapType,      setMapType]      = useState('standard');
    const [searchCenter, setSearchCenter] = useState(null);
    const [pinHint,      setPinHint]      = useState(false);
    const mapRef = useRef(null);

    const hasFilter = filters.min_seats || filters.max_price_per_day || filters.fuel_type;

    const loadCars = useCallback(async () => {
        try {
            setLoading(true);
            const center = searchCenter || userLocation;
            const params = { ...filters };
            if (center) { params.lat = center.latitude; params.lng = center.longitude; params.radius_km = 50; }
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await rentalAPI.getAvailableCars(params);
            setCars(res.data?.cars || []);
        } catch (_) {} finally { setLoading(false); }
    }, [filters, userLocation, searchCenter]);

    const handleMapPress = useCallback(({ latitude, longitude }) => {
        setSearchCenter({ latitude, longitude });
        setSelectedCar(null);
        setPinHint(false);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                await locationService.requestPermissions();
                const loc = await locationService.getCurrentLocation();
                setUserLocation(loc);
            } catch (_) {}
        })();
    }, []);

    useEffect(() => { loadCars(); }, [loadCars]);

    useEffect(() => {
        const onAvailable        = () => loadCars();
        const onUnavailable      = ({ carId }) => {
            setCars(prev => prev.filter(c => c.id !== carId));
            if (selectedCar?.id === carId) setSelectedCar(null);
        };
        const onPositionUpdated  = ({ carId, lat, lng }) =>
            setCars(prev => prev.map(c => c.id === carId ? { ...c, pickup_lat: lat, pickup_lng: lng } : c));
        socketService.on('rental_car_available',        onAvailable);
        socketService.on('rental_car_unavailable',      onUnavailable);
        socketService.on('rental_car_position_updated', onPositionUpdated);
        return () => {
            socketService.off('rental_car_available',        onAvailable);
            socketService.off('rental_car_unavailable',      onUnavailable);
            socketService.off('rental_car_position_updated', onPositionUpdated);
        };
    }, [selectedCar, loadCars]);

    useEffect(() => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude, longitude: userLocation.longitude,
                latitudeDelta: 0.08, longitudeDelta: 0.08,
            }, 800);
        }
    }, [userLocation]);

    const initialRegion = userLocation
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }
        : { latitude: 0.3924, longitude: 9.4536, latitudeDelta: 0.08, longitudeDelta: 0.08 };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerAccent} />
                    <View>
                        <Text style={styles.headerTitle}>Louer un véhicule</Text>
                        <Text style={styles.headerSub}>Véhicules disponibles près de vous</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.filterBtn, (showFilters || hasFilter) && styles.filterBtnActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Ionicons name="options-outline" size={15} color={(showFilters || hasFilter) ? '#fff' : NAVY} />
                        <Text style={[styles.filterBtnLabel, (showFilters || hasFilter) && { color: '#fff' }]}>Filtres</Text>
                        {hasFilter ? <View style={styles.filterDot} /> : null}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.refreshBtn} onPress={loadCars}>
                        <Ionicons name="refresh" size={18} color={NAVY} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Filter bar ── */}
            {showFilters && (
                <View style={styles.filterBar}>
                    <TextInput
                        style={styles.filterInput}
                        placeholder="Places min"
                        value={filters.min_seats}
                        onChangeText={v => setFilters(f => ({ ...f, min_seats: v }))}
                        keyboardType="numeric"
                        placeholderTextColor="#aaa"
                    />
                    <TextInput
                        style={styles.filterInput}
                        placeholder="Prix max/jour (XAF)"
                        value={filters.max_price_per_day}
                        onChangeText={v => setFilters(f => ({ ...f, max_price_per_day: v }))}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#aaa"
                    />
                    <TouchableOpacity style={styles.filterApplyBtn} onPress={loadCars}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Text style={styles.filterApplyText}>Appliquer</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Map ── */}
            <View style={styles.mapContainer}>
                <LeafletMap
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation
                    userLocation={userLocation}
                    mapType={mapType}
                    markers={[
                        ...(searchCenter ? [{ id: 'search', coordinate: searchCenter, type: 'pin', title: 'Zone de recherche' }] : []),
                        ...cars.map(car => ({
                            id: `car-${car.id}`,
                            coordinate: { latitude: parseFloat(car.pickup_lat), longitude: parseFloat(car.pickup_lng) },
                            type: 'car',
                            title: `${car.make} ${car.model}`,
                        })),
                    ]}
                    onPress={handleMapPress}
                    onMarkerPress={(markerId) => {
                        // markerId = 'car-{id}'
                        const carId = markerId.replace('car-', '');
                        const car = cars.find(c => String(c.id) === carId);
                        if (car) setSelectedCar(car);
                    }}
                />

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color={ORANGE} />
                        <Text style={styles.loadingText}>Chargement…</Text>
                    </View>
                )}

                {/* Tap-to-search hint pill */}
                {!searchCenter && !pinHint && (
                    <TouchableOpacity
                        style={[styles.pinHintPill, { bottom: 16 + insets.bottom }]}
                        onPress={() => setPinHint(true)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="finger-print-outline" size={13} color={NAVY} />
                        <Text style={styles.pinHintText}>Touchez la carte pour chercher</Text>
                    </TouchableOpacity>
                )}

                {/* Search-here button when pin is placed */}
                {searchCenter && (
                    <View style={[styles.searchHereRow, { bottom: 16 + insets.bottom }]}>
                        <TouchableOpacity style={styles.searchHereBtn} onPress={loadCars}>
                            <Ionicons name="search" size={14} color="#fff" />
                            <Text style={styles.searchHereText}>Rechercher ici</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.clearPinBtn} onPress={() => { setSearchCenter(null); loadCars(); }}>
                            <Ionicons name="close" size={14} color={NAVY} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Legend — top left */}
                <View style={styles.legend}>
                    <View style={styles.legendDot} />
                    <Text style={styles.legendText}>
                        {cars.length} véhicule{cars.length !== 1 ? 's' : ''} disponible{cars.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                {/* Map buttons — top right, stacked */}
                <View style={styles.mapBtns}>
                    {/* Satellite toggle */}
                    <TouchableOpacity
                        style={[styles.mapTypeBtn, mapType === 'satellite' && styles.mapTypeBtnActive]}
                        onPress={() => setMapType(t => t === 'standard' ? 'satellite' : 'standard')}
                        activeOpacity={0.82}
                    >
                        <Ionicons
                            name={mapType === 'standard' ? 'planet-outline' : 'map-outline'}
                            size={16}
                            color={mapType === 'satellite' ? '#fff' : NAVY}
                        />
                        <Text style={[styles.mapTypeBtnLabel, mapType === 'satellite' && { color: '#fff' }]}>
                            {mapType === 'standard' ? 'Satellite' : 'Plan'}
                        </Text>
                    </TouchableOpacity>

                    {/* Locate-me */}
                    <TouchableOpacity
                        style={styles.locateBtn}
                        onPress={() => userLocation && mapRef.current?.animateToRegion(
                            { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 700
                        )}
                    >
                        <Ionicons name="locate" size={18} color={NAVY} />
                    </TouchableOpacity>

                    {/* Zoom in */}
                    <TouchableOpacity style={styles.locateBtn} onPress={() => mapRef.current?.zoomIn()}>
                        <Ionicons name="add" size={20} color={NAVY} />
                    </TouchableOpacity>

                    {/* Zoom out */}
                    <TouchableOpacity style={styles.locateBtn} onPress={() => mapRef.current?.zoomOut()}>
                        <Ionicons name="remove" size={20} color={NAVY} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Car detail card ── */}
            {selectedCar && (
                <View style={[styles.carCard, { paddingBottom: 16 + insets.bottom }]}>
                    {/* Orange accent bar */}
                    <View style={styles.cardAccentBar} />

                    <TouchableOpacity style={styles.cardClose} onPress={() => setSelectedCar(null)}>
                        <Ionicons name="close" size={18} color="#888" />
                    </TouchableOpacity>

                    <View style={styles.cardTop}>
                        <View style={styles.carIconBig}>
                            <Ionicons name="car" size={32} color={ORANGE} />
                        </View>
                        <View style={styles.carInfo}>
                            <Text style={styles.carName}>{selectedCar.make} {selectedCar.model} {selectedCar.year}</Text>
                            <Text style={styles.carMeta}>{selectedCar.color} · {selectedCar.seats} places · {selectedCar.fuel_type}</Text>
                            <View style={styles.priceRow}>
                                <View style={styles.pricePill}>
                                    <Text style={styles.priceValue}>{Number(selectedCar.price_per_hour).toLocaleString('fr-FR')}</Text>
                                    <Text style={styles.priceUnit}> XAF/h</Text>
                                </View>
                                <View style={[styles.pricePill, { backgroundColor: '#E3F2FD' }]}>
                                    <Text style={[styles.priceValue, { color: BLUE }]}>{Number(selectedCar.price_per_day).toLocaleString('fr-FR')}</Text>
                                    <Text style={[styles.priceUnit, { color: BLUE }]}> XAF/j</Text>
                                </View>
                            </View>
                            <Text style={styles.ownerText}>
                                <Ionicons name="person-outline" size={11} /> {selectedCar.owner?.name}  ⭐ {parseFloat(selectedCar.owner?.rating || 5).toFixed(1)}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => navigation.navigate('RentalCarDetail', { carId: selectedCar.id })}
                    >
                        <Ionicons name="eye-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.viewBtnText}>Voir & réserver</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAccent: { width: 4, height: 36, borderRadius: 2, backgroundColor: ORANGE },
    headerTitle:  { fontSize: 17, fontWeight: '800', color: NAVY },
    headerSub:    { fontSize: 11, color: '#9AA3B0', marginTop: 1, fontWeight: '500' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filterBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: '#F8F9FB', borderRadius: 20,
        borderWidth: 1.5, borderColor: '#E8EAF0',
    },
    filterBtnActive: { backgroundColor: ORANGE, borderColor: ORANGE },
    filterBtnLabel:  { fontSize: 13, fontWeight: '700', color: NAVY },
    filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
    refreshBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#F8F9FB', borderWidth: 1.5, borderColor: '#E8EAF0',
        alignItems: 'center', justifyContent: 'center',
    },

    // Filter bar
    filterBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8,
    },
    filterInput: {
        flex: 1, borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 9,
        fontSize: 13, color: NAVY, backgroundColor: '#F8F9FB',
    },
    filterApplyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: ORANGE, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
    },
    filterApplyText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Map
    mapContainer: { flex: 1 },
    map: { flex: 1 },

    loadingOverlay: {
        position: 'absolute', top: 12, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8,
        ...SHADOWS.md,
    },
    loadingText: { fontSize: 12, fontWeight: '600', color: NAVY },

    legend: {
        position: 'absolute', top: 12, left: 16,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 6,
        ...SHADOWS.sm,
    },
    legendDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: ORANGE },
    legendText: { fontSize: 11, color: NAVY, fontWeight: '600' },

    rentalMarker: {
        backgroundColor: ORANGE, borderRadius: 22, padding: 9,
        borderWidth: 2.5, borderColor: '#fff',
        ...SHADOWS.md,
    },

    // Map action buttons — stacked top-right
    mapBtns: { position: 'absolute', top: 12, right: 14, gap: 8 },

    mapTypeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 20, ...SHADOWS.md,
    },
    mapTypeBtnActive: { backgroundColor: NAVY },
    mapTypeBtnLabel: { fontSize: 12, fontWeight: '700', color: NAVY },

    locateBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        ...SHADOWS.md,
    },

    // Car card
    carCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        paddingHorizontal: 16, paddingTop: 0,
        ...SHADOWS.lg,
    },
    cardAccentBar: {
        height: 4, backgroundColor: ORANGE,
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        marginBottom: 14,
    },
    cardClose: { position: 'absolute', top: 16, right: 14, zIndex: 2, padding: 4 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    carIconBig: {
        width: 58, height: 58, backgroundColor: '#FFF8EE',
        borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        marginRight: 14, borderWidth: 1.5, borderColor: '#FFE0B2',
    },
    carInfo: { flex: 1 },
    carName: { fontSize: 15, fontWeight: '800', color: NAVY },
    carMeta: { fontSize: 12, color: '#9AA3B0', marginTop: 3 },
    priceRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
    pricePill: {
        flexDirection: 'row', alignItems: 'baseline',
        backgroundColor: '#FFF8EE', borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    priceValue: { fontSize: 13, fontWeight: '800', color: ORANGE },
    priceUnit: { fontSize: 10, fontWeight: '600', color: '#E65100' },
    ownerText: { fontSize: 11, color: '#9AA3B0', marginTop: 6 },

    viewBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: ORANGE, borderRadius: 14,
        paddingVertical: 14,
        ...SHADOWS.sm,
    },
    viewBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // Tap-to-pin
    pinHintPill: {
        position: 'absolute', alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8,
        ...SHADOWS.sm,
    },
    pinHintText: { fontSize: 12, color: NAVY, fontWeight: '600' },

    searchHereRow: {
        position: 'absolute', alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    searchHereBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: ORANGE, borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10,
        ...SHADOWS.md,
    },
    searchHereText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    clearPinBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        ...SHADOWS.sm,
    },
    searchPinMarker: {
        backgroundColor: ORANGE, width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
        ...SHADOWS.md,
    },
});

export default RentalMapScreen;
