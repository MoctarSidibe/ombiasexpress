import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
    Platform, Dimensions, Keyboard, Animated,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { deliveryAPI } from '../../services/api.service';
import locationService from '../../services/location.service';
import socketService from '../../services/socket.service';

const NAVY  = '#1C2E4A';
const BROWN = '#5D4037';

const SIZES = [
    { key: 'petit',  label: 'Petit',  icon: 'cube-outline',   sub: '< 5 kg',    color: '#1565C0', mult_key: 'petit' },
    { key: 'moyen',  label: 'Moyen',  icon: 'cube',           sub: '5–15 kg',   color: '#00897B', mult_key: 'moyen' },
    { key: 'lourd',  label: 'Lourd',  icon: 'layers-outline', sub: '> 15 kg',   color: '#E65100', mult_key: 'lourd' },
];

const fmt = n => Number(n || 0).toLocaleString('fr-FR');

const roundTo50 = n => Math.ceil(n / 50) * 50;

const estimateFare = (distKm, size, pricing) => {
    if (!distKm) return null;
    const base = pricing?.base_fare    ?? 500;
    const pKm  = pricing?.price_per_km ?? 300;
    const mult = pricing?.multipliers?.[size] ?? 1.0;
    return roundTo50((base + distKm * pKm) * mult);
};

const { height: SCREEN_H } = Dimensions.get('window');

export default function DeliveryRequestScreen({ navigation }) {
    const insets       = useSafeAreaInsets();
    const mapRef       = useRef(null);
    const debounceRef  = useRef(null);
    const panelBottom  = useRef(new Animated.Value(0)).current;

    const [pricing,        setPricing]        = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [mapType,        setMapType]        = useState('standard');
    const [pickupAddr,     setPickupAddr]     = useState('');
    const [dropoffAddr,    setDropoffAddr]    = useState('');
    const [pickupCoords,   setPickupCoords]   = useState(null);
    const [dropoffCoords,  setDropoffCoords]  = useState(null);
    const [routeCoords,    setRouteCoords]    = useState([]);
    const [distKm,         setDistKm]         = useState(null);
    const [size,           setSize]           = useState('petit');
    const [description,    setDescription]    = useState('');
    const [notes,          setNotes]          = useState('');
    const [activeField,    setActiveField]    = useState(null); // 'pickup' | 'dropoff'
    const [suggestions,    setSuggestions]    = useState([]);
    const [loadingRoute,   setLoadingRoute]   = useState(false);
    const [submitting,     setSubmitting]     = useState(false);
    const [activeDelivery, setActiveDelivery] = useState(null);
    const [checkingActive, setCheckingActive] = useState(true);

    const fare = estimateFare(distKm, size, pricing);

    // ── Keyboard lift ──────────────────────────────────────────────────────────
    useEffect(() => {
        const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const onShow = Keyboard.addListener(show, e =>
            Animated.timing(panelBottom, { toValue: e.endCoordinates.height, duration: 200, useNativeDriver: false }).start()
        );
        const onHide = Keyboard.addListener(hide, () =>
            Animated.timing(panelBottom, { toValue: 0, duration: 200, useNativeDriver: false }).start()
        );
        return () => { onShow.remove(); onHide.remove(); };
    }, []);

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        // Fetch dynamic pricing
        deliveryAPI.getPricing().then(r => setPricing(r.data)).catch(() => {});

        // Check active delivery
        deliveryAPI.getActive()
            .then(r => { if (r.data?.delivery) setActiveDelivery(r.data.delivery); })
            .catch(() => {})
            .finally(() => setCheckingActive(false));

        // Get current location → auto-set as pickup
        locationService.getCurrentLocation().then(loc => {
            const coords = { latitude: loc.latitude, longitude: loc.longitude };
            setCurrentLocation(coords);
            setPickupCoords(coords);
            setPickupAddr('Position actuelle');
            mapRef.current?.animateToRegion({
                ...coords, latitudeDelta: 0.015, longitudeDelta: 0.015,
            }, 800);
        }).catch(() => setCheckingActive(false));
    }, []);

    // ── Route when both coords ready ───────────────────────────────────────────
    useEffect(() => {
        if (pickupCoords && dropoffCoords) fetchRoute(pickupCoords, dropoffCoords);
    }, [pickupCoords, dropoffCoords]);

    // ── Recalc fare on size change ─────────────────────────────────────────────
    // (fare is derived, no extra effect needed)

    // ── Socket: delivery accepted ──────────────────────────────────────────────
    useEffect(() => {
        const onAccepted = (data) => {
            if (activeDelivery && data.deliveryId === activeDelivery.id) {
                Alert.alert('Coursier trouvé !', 'Un coursier a accepté votre livraison.', [{ text: 'OK' }]);
                setActiveDelivery(prev => ({ ...prev, status: 'accepted' }));
            }
        };
        socketService.on('delivery_accepted', onAccepted);
        return () => socketService.off('delivery_accepted', onAccepted);
    }, [activeDelivery]);

    // ── OSRM route ────────────────────────────────────────────────────────────
    const fetchRoute = async (pickup, dropoff) => {
        setLoadingRoute(true);
        setRouteCoords([pickup, dropoff]);
        let dist = 0, coords = [pickup, dropoff];
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const url =
                `https://router.project-osrm.org/route/v1/driving/` +
                `${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}` +
                `?overview=full&geometries=geojson`;
            const res  = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'OmbiaApp/1.0' } });
            clearTimeout(timer);
            const data = await res.json();
            if (data.routes?.[0]) {
                coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
                dist   = data.routes[0].distance / 1000;
            }
        } catch (_) {}
        if (dist === 0) {
            dist = locationService.calculateDistance(
                pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude
            );
        }
        setRouteCoords(coords);
        setDistKm(dist);
        setLoadingRoute(false);
        mapRef.current?.fitToCoordinates([coords[0], coords[coords.length - 1]], {
            edgePadding: { top: 80, right: 40, bottom: 420, left: 40 }, animated: true,
        });
    };

    // ── Nominatim autocomplete ────────────────────────────────────────────────
    const fetchSuggestions = useCallback((query) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query || query.length < 3) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(async () => {
            try {
                const res  = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                    { headers: { 'User-Agent': 'OmbiaApp/1.0' } }
                );
                const data = await res.json();
                setSuggestions(data.map(item => ({
                    id: item.place_id,
                    address: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                })));
            } catch (_) { setSuggestions([]); }
        }, 400);
    }, []);

    const selectSuggestion = (item) => {
        const coords = { latitude: item.lat, longitude: item.lng };
        if (activeField === 'pickup') {
            setPickupAddr(item.address);
            setPickupCoords(coords);
        } else {
            setDropoffAddr(item.address);
            setDropoffCoords(coords);
        }
        setSuggestions([]);
        setActiveField(null);
        Keyboard.dismiss();
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!pickupCoords || !dropoffCoords) {
            return Alert.alert('Adresses manquantes', 'Veuillez renseigner le départ et la destination.');
        }
        if (!distKm) return Alert.alert('Distance', 'Calcul de l\'itinéraire en cours…');
        setSubmitting(true);
        try {
            const res = await deliveryAPI.request({
                pickup_address:      pickupAddr,
                pickup_lat:          pickupCoords.latitude,
                pickup_lng:          pickupCoords.longitude,
                dropoff_address:     dropoffAddr,
                dropoff_lat:         dropoffCoords.latitude,
                dropoff_lng:         dropoffCoords.longitude,
                package_description: description.trim(),
                package_size:        size,
                notes:               notes.trim(),
                distance_km:         distKm,
            });
            setActiveDelivery(res.data.delivery);
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible d\'envoyer la demande');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (!activeDelivery) return;
        Alert.alert('Annuler la livraison', 'Êtes-vous sûr ?', [
            { text: 'Non', style: 'cancel' },
            { text: 'Oui', style: 'destructive', onPress: async () => {
                try {
                    await deliveryAPI.cancel(activeDelivery.id);
                    setActiveDelivery(null);
                } catch (e) {
                    Alert.alert('Erreur', e.response?.data?.error || 'Impossible d\'annuler');
                }
            }},
        ]);
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (checkingActive) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={BROWN} style={{ marginTop: 60 }} />
            </SafeAreaView>
        );
    }

    // ── Active delivery tracker ───────────────────────────────────────────────
    if (activeDelivery) {
        const SM = {
            pending:   { label: 'En attente d\'un coursier…', color: '#F57F17', icon: 'time-outline' },
            accepted:  { label: 'Coursier en route',          color: '#1565C0', icon: 'bicycle-outline' },
            picked_up: { label: 'Colis pris en charge',       color: '#00897B', icon: 'bag-outline' },
        };
        const sm = SM[activeDelivery.status] || SM.pending;
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={NAVY} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Suivi de livraison</Text>
                    <View style={{ width: 36 }} />
                </View>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={styles.trackCard}>
                        <View style={[styles.statusRow, { backgroundColor: sm.color + '15' }]}>
                            <Ionicons name={sm.icon} size={20} color={sm.color} />
                            <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
                        </View>
                        <View style={styles.routeBlock}>
                            <View style={styles.addrRow}>
                                <View style={styles.dotPickup} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.addrLabel}>DÉPART</Text>
                                    <Text style={styles.addrText}>{activeDelivery.pickup_address}</Text>
                                </View>
                            </View>
                            <View style={styles.routeLine} />
                            <View style={styles.addrRow}>
                                <View style={styles.dotDropoff} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.addrLabel}>DESTINATION</Text>
                                    <Text style={styles.addrText}>{activeDelivery.dropoff_address}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.fareRow}>
                            <Text style={styles.fareLabel}>Tarif</Text>
                            <Text style={styles.fareValue}>{fmt(activeDelivery.fare)} XAF</Text>
                        </View>
                        {activeDelivery.courier && (
                            <View style={styles.courierRow}>
                                <View style={styles.courierAvatar}>
                                    <Ionicons name="bicycle" size={22} color={BROWN} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.courierName}>{activeDelivery.courier.name}</Text>
                                    {activeDelivery.courier.phone && (
                                        <Text style={styles.courierPhone}>{activeDelivery.courier.phone}</Text>
                                    )}
                                </View>
                            </View>
                        )}
                        {activeDelivery.status === 'pending' && (
                            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                                <Ionicons name="close-circle-outline" size={18} color="#C62828" />
                                <Text style={styles.cancelBtnText}>Annuler la demande</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── Request form with map ─────────────────────────────────────────────────
    const mapRegion = pickupCoords
        ? { ...pickupCoords, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        : { latitude: 0.4162, longitude: 9.4673, latitudeDelta: 0.1, longitudeDelta: 0.1 }; // Libreville fallback

    const sizeInfo  = SIZES.find(s => s.key === size);

    return (
        <View style={styles.container}>
            {/* ── Full screen map ── */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                mapType={mapType}
                initialRegion={mapRegion}
                showsUserLocation
                showsMyLocationButton={false}
                compassOffset={{ x: -14, y: 108 }}
                onPress={async (e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    const coords = { latitude, longitude };
                    // Smart field detection: use active field, else fill whichever is empty
                    const field = activeField || (!pickupCoords ? 'pickup' : 'dropoff');
                    setSuggestions([]);
                    Keyboard.dismiss();
                    mapRef.current?.animateToRegion(
                        { ...coords, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 400
                    );
                    let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                    try {
                        const r = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                            { headers: { 'User-Agent': 'OmbiaApp/1.0' } }
                        );
                        const d = await r.json();
                        if (d.display_name) address = d.display_name;
                    } catch (_) {}
                    if (field === 'pickup') {
                        setPickupCoords(coords); setPickupAddr(address);
                    } else {
                        setDropoffCoords(coords); setDropoffAddr(address);
                    }
                    setActiveField(null);
                }}
            >
                {pickupCoords && (
                    <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 1 }}>
                        <View style={styles.markerPickup}>
                            <Ionicons name="location" size={22} color="#fff" />
                        </View>
                    </Marker>
                )}
                {dropoffCoords && (
                    <Marker coordinate={dropoffCoords} anchor={{ x: 0.5, y: 1 }}>
                        <View style={styles.markerDropoff}>
                            <Ionicons name="flag" size={18} color="#fff" />
                        </View>
                    </Marker>
                )}
                {routeCoords.length > 1 && (
                    <Polyline coordinates={routeCoords} strokeColor={BROWN} strokeWidth={3} lineDashPattern={[1]} />
                )}
            </MapView>

            {/* ── Back + title overlay ── */}
            <SafeAreaView style={styles.backOverlay} edges={['top']}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color={NAVY} />
                </TouchableOpacity>
                <Text style={styles.mapTitle}>Livraison Express</Text>
            </SafeAreaView>


            {/* ── Map buttons (satellite + locate) ── */}
            <View style={styles.mapBtns}>
                <TouchableOpacity
                    style={[styles.mapTypeBtn, mapType === 'satellite' && styles.mapTypeBtnActive]}
                    onPress={() => setMapType(t => t === 'standard' ? 'satellite' : 'standard')}
                    activeOpacity={0.82}
                >
                    <Ionicons
                        name={mapType === 'standard' ? 'planet-outline' : 'map-outline'}
                        size={15}
                        color={mapType === 'satellite' ? '#fff' : '#1C2E4A'}
                    />
                    <Text style={[styles.mapTypeBtnLabel, mapType === 'satellite' && { color: '#fff' }]}>
                        {mapType === 'standard' ? 'Satellite' : 'Plan'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.locateBtn}
                    onPress={() => currentLocation && mapRef.current?.fitToCoordinates(
                        [currentLocation],
                        { edgePadding: { top: 80, right: 60, bottom: Math.round(SCREEN_H * 0.78) + 30, left: 60 }, animated: true }
                    )}
                >
                    <Ionicons name="locate" size={18} color="#1C2E4A" />
                </TouchableOpacity>
            </View>

            {/* ── Autocomplete suggestions — floats above the panel ── */}
            {suggestions.length > 0 && (
                <Animated.View style={[styles.suggestionsOverlay, { bottom: panelBottom + SCREEN_H * 0.62 - 20 }]}>
                    {suggestions.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.suggestion}
                            onPress={() => selectSuggestion(item)}
                        >
                            <Ionicons name="location-outline" size={14} color="#888" style={{ marginRight: 8 }} />
                            <Text style={styles.suggestionText} numberOfLines={2}>{item.address}</Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            )}

            {/* ── Bottom panel ── */}
            <KeyboardAvoidingView
                style={styles.panelWrap}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View style={[styles.panel, { marginBottom: panelBottom, paddingBottom: 16 + insets.bottom }]}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Address inputs */}
                        <View style={styles.addrCard}>
                            {/* Pickup row */}
                            <TouchableOpacity
                                style={[styles.addrInput, activeField === 'pickup' && styles.addrInputActive]}
                                onPress={() => { setActiveField('pickup'); setSuggestions([]); }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.dotPickup} />
                                {activeField === 'pickup' ? (
                                    <TextInput
                                        style={styles.addrInputText}
                                        value={pickupAddr}
                                        onChangeText={t => { setPickupAddr(t); fetchSuggestions(t); }}
                                        placeholder="Adresse de départ"
                                        placeholderTextColor="#C0C8D0"
                                        autoFocus
                                    />
                                ) : (
                                    <Text style={[styles.addrInputText, !pickupAddr && { color: '#C0C8D0' }]} numberOfLines={1}>
                                        {pickupAddr || 'Adresse de départ'}
                                    </Text>
                                )}
                                {pickupAddr ? (
                                    <TouchableOpacity onPress={() => { setPickupAddr(''); setPickupCoords(null); setRouteCoords([]); setDistKm(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="close-circle" size={16} color="#C0C8D0" />
                                    </TouchableOpacity>
                                ) : null}
                            </TouchableOpacity>

                            <View style={styles.addrDivider} />

                            {/* Dropoff row */}
                            <TouchableOpacity
                                style={[styles.addrInput, activeField === 'dropoff' && styles.addrInputActive]}
                                onPress={() => { setActiveField('dropoff'); setSuggestions([]); }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.dotDropoff} />
                                {activeField === 'dropoff' ? (
                                    <TextInput
                                        style={styles.addrInputText}
                                        value={dropoffAddr}
                                        onChangeText={t => { setDropoffAddr(t); fetchSuggestions(t); }}
                                        placeholder="Adresse de livraison"
                                        placeholderTextColor="#C0C8D0"
                                        autoFocus
                                    />
                                ) : (
                                    <Text style={[styles.addrInputText, !dropoffAddr && { color: '#C0C8D0' }]} numberOfLines={1}>
                                        {dropoffAddr || 'Adresse de livraison'}
                                    </Text>
                                )}
                                {dropoffAddr ? (
                                    <TouchableOpacity onPress={() => { setDropoffAddr(''); setDropoffCoords(null); setRouteCoords([]); setDistKm(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="close-circle" size={16} color="#C0C8D0" />
                                    </TouchableOpacity>
                                ) : null}
                            </TouchableOpacity>

                        </View>

                        {/* Hint — shown until both addresses are filled */}
                        {(!pickupCoords || !dropoffCoords) && (
                            <View style={styles.mapPinHint}>
                                <Ionicons name="finger-print-outline" size={15} color="#1565C0" />
                                <Text style={styles.mapPinHintText}>
                                    {!pickupCoords
                                        ? 'Saisissez le départ ou touchez la carte'
                                        : 'Saisissez la destination ou touchez la carte'}
                                </Text>
                            </View>
                        )}

                        {/* Package size */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Taille du colis</Text>
                            <View style={styles.sizeRow}>
                                {SIZES.map(s => (
                                    <TouchableOpacity
                                        key={s.key}
                                        style={[styles.sizeChip, size === s.key && { borderColor: s.color, backgroundColor: s.color + '12' }]}
                                        onPress={() => setSize(s.key)}
                                    >
                                        <Ionicons name={s.icon} size={18} color={size === s.key ? s.color : '#bbb'} />
                                        <View>
                                            <Text style={[styles.sizeLabel, size === s.key && { color: s.color }]}>{s.label}</Text>
                                            <Text style={styles.sizeSub}>{s.sub}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Notes / Instructions */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Notes & instructions (optionnel)</Text>
                            <TextInput
                                style={styles.textarea}
                                value={notes || description}
                                onChangeText={v => { setNotes(v); setDescription(v); }}
                                placeholder="Contenu, fragilité, code porte, appeler à l'arrivée…"
                                placeholderTextColor="#C0C8D0"
                            />
                        </View>

                        {/* Fare card */}
                        <View style={styles.fareCard}>
                            <View style={styles.fareCardTop}>
                                <View>
                                    <Text style={styles.fareCardLabel}>Tarif estimé</Text>
                                    {distKm ? (
                                        <Text style={styles.fareCardSub}>
                                            {distKm.toFixed(1)} km · {sizeInfo?.label} colis
                                            {sizeInfo && pricing?.multipliers?.[size] !== 1.0
                                                ? ` · ×${pricing.multipliers[size]}` : ''}
                                        </Text>
                                    ) : (
                                        <Text style={styles.fareCardSub}>
                                            {loadingRoute ? 'Calcul…' : 'Saisissez les adresses'}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.fareCardValue}>
                                    {loadingRoute ? '…' : fare ? `${fmt(fare)} XAF` : '—'}
                                </Text>
                            </View>
                            {pricing && distKm ? (
                                <View style={styles.fareBreakdown}>
                                    <BreakdownRow label={`Base`} value={`${fmt(pricing.base_fare)} XAF`} />
                                    <BreakdownRow label={`Distance (${distKm.toFixed(1)} km × ${fmt(pricing.price_per_km)})`} value={`${fmt(Math.round(distKm * pricing.price_per_km))} XAF`} />
                                    {pricing.multipliers?.[size] !== 1.0 && (
                                        <BreakdownRow label={`Majoration ${sizeInfo?.label}`} value={`×${pricing.multipliers[size]}`} highlight />
                                    )}
                                </View>
                            ) : null}
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, (!pickupCoords || !dropoffCoords || !distKm) && { opacity: 0.4 }]}
                            onPress={handleSubmit}
                            disabled={submitting || !pickupCoords || !dropoffCoords || !distKm}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={20} color="#fff" />
                                    <Text style={styles.submitBtnText}>Demander un coursier</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

function BreakdownRow({ label, value, highlight }) {
    return (
        <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{label}</Text>
            <Text style={[styles.breakdownValue, highlight && { color: '#E65100', fontWeight: '700' }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    backOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
    mapTitle: { fontSize: 15, fontWeight: '800', color: NAVY, backgroundColor: '#ffffffCC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    mapPinHint: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#EEF4FF', borderWidth: 1.5, borderColor: '#1565C0',
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
        marginBottom: 8,
    },
    mapPinHintText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#1C2E4A' },
    mapBtns: { position: 'absolute', top: 80, right: 14, gap: 8 },
    mapTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
    mapTypeBtnActive: { backgroundColor: '#1C2E4A' },
    mapTypeBtnLabel: { fontSize: 12, fontWeight: '700', color: '#1C2E4A' },
    locateBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },

    panelWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    panel: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: SCREEN_H * 0.78,
        paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 16,
    },

    addrCard: { backgroundColor: '#F8F9FB', borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E8EAF0' },
    addrInput: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8 },
    addrInputActive: { backgroundColor: '#F0F4FF' },
    addrInputText: { flex: 1, fontSize: 14, color: NAVY, fontWeight: '600' },
    addrDivider: { height: 1, backgroundColor: '#E8EAF0', marginLeft: 24, marginVertical: 2 },

    suggestionsOverlay: {
        position: 'absolute', left: 16, right: 16,
        backgroundColor: '#fff', borderRadius: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 20,
        zIndex: 100, maxHeight: 220, overflow: 'hidden',
    },
    suggestion: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    suggestionText: { flex: 1, fontSize: 12, color: '#555', lineHeight: 16 },

    section: { marginBottom: 8 },
    sectionLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },

    sizeRow: { flexDirection: 'row', gap: 6 },
    sizeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8EAF0', backgroundColor: '#fff' },
    sizeLabel: { fontSize: 12, fontWeight: '700', color: '#888' },
    sizeSub: { fontSize: 10, color: '#bbb' },

    textarea: { backgroundColor: '#F8F9FB', borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: NAVY, minHeight: 38 },

    fareCard: { backgroundColor: '#EFEBE9', borderRadius: 14, padding: 10, marginBottom: 10 },
    fareCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    fareCardLabel: { fontSize: 12, fontWeight: '700', color: '#6D4C41' },
    fareCardSub: { fontSize: 10, color: '#8D6E63', marginTop: 2 },
    fareCardValue: { fontSize: 18, fontWeight: '900', color: BROWN },
    fareBreakdown: { borderTopWidth: 1, borderTopColor: '#D7CCC8', paddingTop: 6, gap: 3 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
    breakdownLabel: { fontSize: 11, color: '#8D6E63' },
    breakdownValue: { fontSize: 11, color: '#6D4C41', fontWeight: '600' },

    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BROWN, paddingVertical: 13, borderRadius: 14, gap: 8, marginBottom: 4 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Map markers
    markerPickup:  { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    markerDropoff: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#C62828', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },

    // Tracking
    scroll: { padding: 16, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: NAVY },
    trackCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, marginBottom: 16 },
    statusText: { fontSize: 15, fontWeight: '700' },
    routeBlock: { marginBottom: 16 },
    addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    addrLabel: { fontSize: 10, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
    addrText: { fontSize: 14, fontWeight: '600', color: NAVY, lineHeight: 20 },
    routeLine: { height: 20, width: 2, backgroundColor: '#E0E0E0', marginLeft: 5, marginVertical: 4 },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0', marginBottom: 16 },
    fareLabel: { fontSize: 14, color: '#888' },
    fareValue: { fontSize: 16, fontWeight: '800', color: BROWN },
    courierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    courierAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFEBE9', alignItems: 'center', justifyContent: 'center' },
    courierName: { fontSize: 14, fontWeight: '700', color: NAVY },
    courierPhone: { fontSize: 12, color: BROWN, marginTop: 2 },
    cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#C62828' },
    dotPickup:  { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1565C0', flexShrink: 0 },
    dotDropoff: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#C62828', flexShrink: 0 },
});
