import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Animated,
    Keyboard,
    Platform,
    Dimensions,
    Image,
    Modal,
    KeyboardAvoidingView,
} from 'react-native';
import LeafletMap from '../../components/LeafletMap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/colors';
import PaymentMethodCard, { MiniOmbiaCard, PAYMENT_METHODS } from '../../components/PaymentMethodCard';
import locationService from '../../services/location.service';
import { rideAPI, couponAPI } from '../../services/api.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');


const RideRequestScreen = ({ navigation }) => {
    const insets       = useSafeAreaInsets();
    const mapRef       = useRef(null);
    const debounceRef  = useRef(null);
    const panelBottom  = useRef(new Animated.Value(0)).current;   // keyboard lift

    const [currentLocation,    setCurrentLocation]    = useState(null);
    const [pickupAddress,      setPickupAddress]       = useState('');
    const [dropoffAddress,     setDropoffAddress]      = useState('');
    const [pickupCoords,       setPickupCoords]        = useState(null);
    const [dropoffCoords,      setDropoffCoords]       = useState(null);
    const [routeCoordinates,   setRouteCoordinates]    = useState([]);
    const [paymentMethod,      setPaymentMethod]       = useState('wallet');
    const [fareEstimate,       setFareEstimate]        = useState(null);
    const [distance,           setDistance]            = useState(0);
    const [duration,           setDuration]            = useState(0);
    const [loading,            setLoading]             = useState(false);
    const [loadingRoute,       setLoadingRoute]        = useState(false);
    const [showPaymentMethods, setShowPaymentMethods]  = useState(false);
    const [mapType,            setMapType]             = useState('standard');
    const [activeField,        setActiveField]         = useState(null);
    const [suggestions,        setSuggestions]         = useState([]);
    const [loadingSuggestions, setLoadingSuggestions]  = useState(false);
    const [pricing,            setPricing]             = useState(null);
    const [fareType,           setFareType]            = useState('per_km');   // 'per_km' | 'per_hour'
    const [bookedHours,        setBookedHours]         = useState(1);
    const [couponCode,         setCouponCode]          = useState('');
    const [couponResult,       setCouponResult]        = useState(null);   // { discount, final_fare, type, description }
    const [couponLoading,      setCouponLoading]       = useState(false);
    const [couponError,        setCouponError]         = useState(null);

    // ─── Keyboard: lift panel above keyboard ────────────────────────────────
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = Keyboard.addListener(showEvent, (e) => {
            Animated.timing(panelBottom, {
                toValue: e.endCoordinates.height,
                duration: Platform.OS === 'ios' ? (e.duration || 250) : 180,
                useNativeDriver: false,
            }).start();
        });
        const onHide = Keyboard.addListener(hideEvent, (e) => {
            Animated.timing(panelBottom, {
                toValue: 0,
                duration: Platform.OS === 'ios' ? (e.duration || 250) : 180,
                useNativeDriver: false,
            }).start();
        });
        return () => { onShow.remove(); onHide.remove(); };
    }, []);

    // ─── Fetch dynamic pricing from admin settings ───────────────────────────
    useEffect(() => {
        rideAPI.getPricing()
            .then(r => {
                setPricing(r.data);
                // If admin disabled hourly while user had it selected, reset to per_km
                if (r.data.hourly_enabled === false) setFareType('per_km');
            })
            .catch(() => {}); // falls back to defaults in calcFare
    }, []);

    // ─── Init location ───────────────────────────────────────────────────────
    useEffect(() => { getCurrentLocation(); }, []);

    // ─── Route + fare when both coords ready ────────────────────────────────
    useEffect(() => {
        if (pickupCoords && dropoffCoords) updateRoute(pickupCoords, dropoffCoords);
    }, [pickupCoords, dropoffCoords]);

    // ─── Recalc fare when fare type or booked hours change ───────────────────
    useEffect(() => {
        if (fareType === 'per_hour' || distance > 0) {
            calcFare(distance, duration, pricing, fareType, bookedHours);
        }
    }, [fareType, bookedHours]);

    // ────────────────────────────────────────────────────────────────────────
    const getCurrentLocation = async () => {
        try {
            await locationService.requestPermissions();
            const loc = await locationService.getCurrentLocation();
            setCurrentLocation(loc);
            setPickupCoords({ latitude: loc.latitude, longitude: loc.longitude });
            setPickupAddress('Position actuelle');
            setTimeout(() => {
                mapRef.current?.setCenter(loc.latitude, loc.longitude, 14);
            }, 1000);
        } catch {
            Alert.alert(
                'Localisation requise',
                'Activez la localisation dans les paramètres de votre téléphone.',
            );
        }
    };

    // ─── OSRM road route (free, no API key) ─────────────────────────────────
    const updateRoute = async (pickup, dropoff) => {
        setLoadingRoute(true);
        setRouteCoordinates([pickup, dropoff]);   // immediate straight-line preview

        let dist = 0, dur = 0, coords = [pickup, dropoff];

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const url =
                `https://router.project-osrm.org/route/v1/driving/` +
                `${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}` +
                `?overview=full&geometries=geojson`;
            const res  = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'RideShareApp/1.0' } });
            clearTimeout(timer);
            const data = await res.json();
            if (data.routes?.[0]) {
                const route = data.routes[0];
                coords = route.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
                dist   = route.distance / 1000;          // metres → km
                dur    = Math.round(route.duration / 60); // seconds → minutes
            }
        } catch (_) {}

        // Fallback: haversine + straight line
        if (dist === 0) {
            dist = locationService.calculateDistance(
                pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude
            );
            dur  = Math.round((dist / 40) * 60);
            coords = [pickup, dropoff];
        }

        setRouteCoordinates(coords);
        setDistance(dist);
        setDuration(dur);
        calcFare(dist, dur, pricing, fareType, bookedHours);
        setLoadingRoute(false);

        if (mapRef.current) {
            mapRef.current.fitToCoordinates(
                [coords[0], coords[coords.length - 1]],
                { edgePadding: { top: 100, right: 50, bottom: 350, left: 50 }, animated: true }
            );
        }
    };

    // Rates come from admin settings; fallback values used if fetch hasn't completed yet.
    // Mirrors server-side logic so the estimate the user sees matches the actual charge.
    const calcFare = (dist, dur, rates, type = 'per_km', hours = 1) => {
        const DISCOUNT  = rates?.wallet_discount ?? 5;
        const currency  = rates?.currency ?? 'XAF';
        const MIN_FARE  = rates?.min_fare ?? 800;
        const NIGHT_PCT = rates?.night_surcharge_pct ?? 20;
        const NIGHT_START = rates?.night_start_hour ?? 22;
        const NIGHT_END   = rates?.night_end_hour   ?? 6;
        const LONG_THRESH = rates?.long_dist_threshold_km ?? 25;
        const LONG_PER_KM = rates?.long_dist_per_km ?? 120;

        let subtotal;
        let badges = [];   // labels shown in the UI

        if (type === 'per_hour') {
            const BASE     = rates?.hourly_base_fare   ?? 2000;
            const PER_HOUR = rates?.per_hour           ?? 3500;
            const BOOKING  = rates?.hourly_booking_fee ?? 500;
            subtotal = BASE + (PER_HOUR * hours) + BOOKING;

            // Night surcharge preview
            const h = new Date().getHours();
            const isNight = NIGHT_START > NIGHT_END
                ? (h >= NIGHT_START || h < NIGHT_END)
                : (h >= NIGHT_START && h < NIGHT_END);
            const nightActive = NIGHT_PCT > 0 && isNight;
            if (nightActive) {
                subtotal = subtotal * (1 + NIGHT_PCT / 100);
            }
            subtotal = Math.max(subtotal, MIN_FARE);

            setFareEstimate({
                isNight: nightActive,
                nightPct: NIGHT_PCT,
                type,
                baseFare:    BASE.toFixed(0),
                hourCost:    (PER_HOUR * hours).toFixed(0),
                bookingFee:  BOOKING.toFixed(0),
                bookedHours: hours,
                perHourRate: PER_HOUR.toFixed(0),
                total:       subtotal.toFixed(0),
                walletTotal: (subtotal * (1 - DISCOUNT / 100)).toFixed(0),
                discount:    DISCOUNT,
                currency,
                badges,
                // Human-readable breakdown for the hint line
                hint: `Prise en charge ${BASE.toLocaleString()} + ${PER_HOUR.toLocaleString()} XAF × ${hours}h + frais ${BOOKING.toLocaleString()}`,
            });
        } else {
            if (!dist) return;
            const BASE_FARE   = rates?.base_fare   ?? 500;
            const PER_KM      = rates?.per_km      ?? 200;
            const PER_MINUTE  = rates?.per_minute  ?? 50;
            const BOOKING_FEE = rates?.booking_fee ?? 150;

            // Long-distance rate: normal up to threshold, discounted beyond
            let distCost;
            if (LONG_THRESH > 0 && dist > LONG_THRESH) {
                distCost = (LONG_THRESH * PER_KM) + ((dist - LONG_THRESH) * LONG_PER_KM);
                badges.push(`Longue distance: ${LONG_PER_KM} XAF/km au-delà de ${LONG_THRESH} km`);
            } else {
                distCost = dist * PER_KM;
            }

            const timeCost = dur * PER_MINUTE;
            subtotal = BASE_FARE + distCost + timeCost + BOOKING_FEE;

            // Night surcharge
            const h = new Date().getHours();
            const isNight = NIGHT_START > NIGHT_END
                ? (h >= NIGHT_START || h < NIGHT_END)
                : (h >= NIGHT_START && h < NIGHT_END);
            const nightActive = NIGHT_PCT > 0 && isNight;
            if (nightActive) {
                subtotal = subtotal * (1 + NIGHT_PCT / 100);
            }

            // Minimum fare floor
            subtotal = Math.max(subtotal, MIN_FARE);

            setFareEstimate({
                type,
                baseFare:     BASE_FARE.toFixed(0),
                distanceCost: distCost.toFixed(0),
                timeCost:     timeCost.toFixed(0),
                bookingFee:   BOOKING_FEE.toFixed(0),
                total:        subtotal.toFixed(0),
                walletTotal:  (subtotal * (1 - DISCOUNT / 100)).toFixed(0),
                discount:     DISCOUNT,
                currency,
                badges,
                isNight:  nightActive,
                nightPct: NIGHT_PCT,
                hint: null,
            });
        }
    };

    // ─── Nominatim autocomplete ──────────────────────────────────────────────
    const fetchSuggestions = (query) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query || query.length < 3) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(async () => {
            setLoadingSuggestions(true);
            try {
                const res  = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                    { headers: { 'User-Agent': 'RideShareApp/1.0' } }
                );
                const data = await res.json();
                setSuggestions(data.map(item => ({
                    id:      item.place_id,
                    address: item.display_name,
                    lat:     parseFloat(item.lat),
                    lng:     parseFloat(item.lon),
                })));
            } catch (_) { setSuggestions([]); }
            finally { setLoadingSuggestions(false); }
        }, 400);
    };

    const handleSuggestionSelect = (item) => {
        const coords = { latitude: item.lat, longitude: item.lng };
        if (activeField === 'pickup') {
            setPickupAddress(item.address);
            setPickupCoords(coords);
        } else {
            setDropoffAddress(item.address);
            setDropoffCoords(coords);
        }
        setSuggestions([]);
        setActiveField(null);
        Keyboard.dismiss();
    };

    // ─── Validate coupon ─────────────────────────────────────────────────────
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        if (!fareEstimate) {
            setCouponError('Calculez d\'abord un tarif');
            return;
        }
        setCouponLoading(true);
        setCouponError(null);
        setCouponResult(null);
        try {
            const res = await couponAPI.validate(couponCode.trim().toUpperCase(), parseFloat(fareEstimate.total));
            setCouponResult(res.data);
        } catch (err) {
            const raw = err.response?.data?.error || '';
            // Map server messages to clean French UI strings
            const msg = raw.includes('expiré')          ? 'Ce code promo est expiré.'
                      : raw.includes('actif')           ? 'Ce code promo n\'est plus actif.'
                      : raw.includes('limite')          ? 'Ce code promo a atteint sa limite d\'utilisation.'
                      : raw.includes('déjà utilisé')    ? 'Vous avez déjà utilisé ce code promo.'
                      : raw.includes('minimum')         ? raw   // keep the XAF amount in the message
                      : raw.includes('invalide')        ? 'Code promo invalide.'
                      : raw.includes('Route not found') ? 'Service indisponible, réessayez.'
                      : raw || 'Code promo invalide.';
            setCouponError(msg);
        } finally {
            setCouponLoading(false);
        }
    };

    // ─── Request ride ────────────────────────────────────────────────────────
    const handleRequestRide = async () => {
        if (!pickupCoords || !dropoffCoords) {
            Alert.alert('Erreur', 'Veuillez définir un point de départ et d\'arrivée');
            return;
        }
        setLoading(true);
        try {
            const response = await rideAPI.request({
                pickup_address:  pickupAddress,
                dropoff_address: dropoffAddress,
                pickup_lat:      pickupCoords.latitude,
                pickup_lng:      pickupCoords.longitude,
                dropoff_lat:     dropoffCoords.latitude,
                dropoff_lng:     dropoffCoords.longitude,
                distance_km:      distance,
                duration_minutes: duration,
                payment_method:   paymentMethod,
                fare_type:        fareType,
                booked_hours:     fareType === 'per_hour' ? bookedHours : undefined,
                coupon_code:      couponResult ? couponCode.trim().toUpperCase() : undefined,
            });
            Alert.alert('Succès', 'Course demandée ! Recherche d\'un chauffeur...', [
                { text: 'OK', onPress: () => navigation.navigate('RideTracking', { rideId: response.data.ride.id }) },
            ]);
        } catch (error) {
            Alert.alert('Erreur', error.response?.data?.error || 'Échec de la demande');
        } finally {
            setLoading(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Full-screen map */}
            <LeafletMap
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={currentLocation || { latitude: 0.4162, longitude: 9.4673, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
                showsUserLocation
                userLocation={currentLocation}
                mapType={mapType}
                markers={[
                    ...(pickupCoords  ? [{ id: 'pickup',  coordinate: pickupCoords,  type: 'pickup'  }] : []),
                    ...(dropoffCoords ? [{ id: 'dropoff', coordinate: dropoffCoords, type: 'dropoff' }] : []),
                ]}
                polylines={routeCoordinates.length > 1 ? [{ id: 'route', coordinates: routeCoordinates, color: COLORS.primary, width: 4 }] : []}
                onPress={async ({ latitude, longitude }) => {
                    const coords = { latitude, longitude };
                    setSuggestions([]);
                    Keyboard.dismiss();
                    let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                    try {
                        const r = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                            { headers: { 'User-Agent': 'OmbiaApp/1.0' } }
                        );
                        const d = await r.json();
                        if (d.display_name) address = d.display_name;
                    } catch (_) {}
                    if (activeField === 'pickup') {
                        setPickupCoords(coords);
                        setPickupAddress(address);
                    } else {
                        setDropoffCoords(coords);
                        setDropoffAddress(address);
                    }
                    setActiveField(null);
                }}
            />

            {/* Route loading spinner */}
            {loadingRoute && (
                <View style={styles.routeLoadingBadge}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.routeLoadingText}>Calcul de l'itinéraire…</Text>
                </View>
            )}


            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Map buttons — satellite + locate, grouped top-right */}
            <View style={styles.mapBtns}>
                <TouchableOpacity
                    style={[styles.mapTypeBtn, mapType === 'satellite' && styles.mapTypeBtnActive]}
                    onPress={() => setMapType(t => t === 'standard' ? 'satellite' : 'standard')}
                    activeOpacity={0.82}
                >
                    <Ionicons
                        name={mapType === 'standard' ? 'planet-outline' : 'map-outline'}
                        size={16}
                        color={mapType === 'satellite' ? '#fff' : '#1C2E4A'}
                    />
                    <Text style={[styles.mapTypeBtnLabel, mapType === 'satellite' && { color: '#fff' }]}>
                        {mapType === 'standard' ? 'Satellite' : 'Plan'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.locateBtn}
                    onPress={() => {
                        if (currentLocation) {
                            mapRef.current?.setCenter(currentLocation.latitude, currentLocation.longitude, 15);
                        } else {
                            getCurrentLocation();
                        }
                    }}
                >
                    <Ionicons name="locate" size={18} color="#1C2E4A" />
                </TouchableOpacity>
            </View>

            {/* ── Bottom panel — Animated.View rises above keyboard ── */}
            <Animated.View style={[styles.panel, { bottom: panelBottom, paddingBottom: SPACING.lg + insets.bottom + 16, maxHeight: fareType === 'per_hour' ? SCREEN_HEIGHT * 0.82 : SCREEN_HEIGHT * 0.65 }]}>
                <View style={styles.dragHandle} />
                <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView
                    scrollEnabled={fareType === 'per_hour'}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    {/* Location Inputs */}
                    <View style={styles.section}>
                        <View style={styles.locationInputContainer}>
                            <View style={styles.locationDots}>
                                <View style={styles.dotPickup} />
                                <View style={styles.dotLine} />
                                <View style={styles.dotDropoff} />
                            </View>
                            <View style={styles.locationInputs}>
                                <TextInput
                                    style={styles.locationInput}
                                    placeholder="Adresse de départ"
                                    value={pickupAddress}
                                    onFocus={() => setActiveField('pickup')}
                                    onChangeText={(text) => { setPickupAddress(text); fetchSuggestions(text); }}
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                                <View style={styles.inputDivider} />
                                <TextInput
                                    style={styles.locationInput}
                                    placeholder="Où allez-vous ?"
                                    value={dropoffAddress}
                                    onFocus={() => setActiveField('dropoff')}
                                    onChangeText={(text) => { setDropoffAddress(text); fetchSuggestions(text); }}
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>
                        </View>

                        {/* Autocomplete suggestions */}
                        {(loadingSuggestions || suggestions.length > 0) && (
                            <View style={styles.suggestionsBox}>
                                {loadingSuggestions && (
                                    <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 10 }} />
                                )}
                                {suggestions.map((item, index) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.suggestionItem,
                                            index === suggestions.length - 1 && { borderBottomWidth: 0 },
                                        ]}
                                        onPress={() => handleSuggestionSelect(item)}
                                    >
                                        <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                                        <Text style={styles.suggestionText} numberOfLines={2}>{item.address}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {(!pickupCoords || !dropoffCoords) && !loadingSuggestions && suggestions.length === 0 && (
                            <View style={styles.mapHint}>
                                <Ionicons name="finger-print-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.mapHintText}>
                                    {!pickupCoords
                                        ? 'Saisissez le départ ou touchez la carte'
                                        : 'Saisissez la destination ou touchez la carte'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Route Info */}
                    {distance > 0 && suggestions.length === 0 && (
                        <View style={styles.routeInfo}>
                            <View style={styles.routeInfoItem}>
                                <Ionicons name="navigate" size={20} color={COLORS.textSecondary} />
                                <Text style={styles.routeInfoText}>{distance.toFixed(1)} km</Text>
                            </View>
                            <View style={styles.routeInfoItem}>
                                <Ionicons name="time" size={20} color={COLORS.textSecondary} />
                                <Text style={styles.routeInfoText}>{duration} min</Text>
                            </View>
                        </View>
                    )}

                    {/* ── Fare type selector — only shown if hourly is enabled in admin ── */}
                    {(pickupCoords || distance > 0) && suggestions.length === 0 && pricing?.hourly_enabled !== false && (
                        <View style={styles.fareTypeRow}>
                            <TouchableOpacity
                                style={[styles.fareTypeBtn, fareType === 'per_km' && styles.fareTypeBtnActive]}
                                onPress={() => setFareType('per_km')}
                            >
                                <Ionicons name="navigate" size={16} color={fareType === 'per_km' ? '#fff' : COLORS.textSecondary} />
                                <Text style={[styles.fareTypeBtnText, fareType === 'per_km' && styles.fareTypeBtnTextActive]}>Par km</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.fareTypeBtn, fareType === 'per_hour' && styles.fareTypeBtnActive]}
                                onPress={() => setFareType('per_hour')}
                            >
                                <Ionicons name="time" size={16} color={fareType === 'per_hour' ? '#fff' : COLORS.textSecondary} />
                                <Text style={[styles.fareTypeBtnText, fareType === 'per_hour' && styles.fareTypeBtnTextActive]}>À l'heure</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Hours picker (per_hour only) ── */}
                    {fareType === 'per_hour' && suggestions.length === 0 && (
                        <View style={styles.hoursPickerWrap}>
                            <Text style={styles.hoursPickerLabel}>Durée souhaitée</Text>
                            <View style={styles.hoursPickerRow}>
                                {[1, 2, 3, 4, 6, 8].map(h => (
                                    <TouchableOpacity
                                        key={h}
                                        style={[styles.hourBtn, bookedHours === h && styles.hourBtnActive]}
                                        onPress={() => setBookedHours(h)}
                                    >
                                        <Text style={[styles.hourBtnText, bookedHours === h && styles.hourBtnTextActive]}>
                                            {h}h
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {fareEstimate?.hint ? (
                                <Text style={styles.hourRateHint}>{fareEstimate.hint}</Text>
                            ) : fareEstimate?.perHourRate ? (
                                <Text style={styles.hourRateHint}>
                                    Prise en charge {parseInt(fareEstimate.baseFare).toLocaleString()} XAF
                                    {' + '}{parseInt(fareEstimate.perHourRate).toLocaleString()} XAF × {fareEstimate.bookedHours}h
                                    {' + frais '}{parseInt(fareEstimate.bookingFee).toLocaleString()} XAF
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {/* Fare + Payment */}
                    {fareEstimate && suggestions.length === 0 && (
                        <>
                            {/* Payment selector — Modal dropdown */}
                            <View style={styles.paymentWrap}>
                            <TouchableOpacity
                                style={styles.paymentSelector}
                                onPress={() => setShowPaymentMethods(!showPaymentMethods)}
                            >
                                {/* Left: visual logo / mini card */}
                                {paymentMethod === 'wallet' ? (
                                    <MiniOmbiaCard width={52} height={36} />
                                ) : PAYMENT_METHODS[paymentMethod]?.type === 'image' ? (
                                    <Image
                                        source={PAYMENT_METHODS[paymentMethod].image}
                                        style={styles.paymentSelectorLogo}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={[styles.paymentSelectorIcon, { backgroundColor: PAYMENT_METHODS[paymentMethod]?.iconBg }]}>
                                        <Ionicons name={PAYMENT_METHODS[paymentMethod]?.icon} size={20} color={PAYMENT_METHODS[paymentMethod]?.iconColor} />
                                    </View>
                                )}

                                {/* Label */}
                                <View style={styles.paymentSelectorInfo}>
                                    <Text style={styles.paymentText}>
                                        {PAYMENT_METHODS[paymentMethod]?.name || paymentMethod}
                                    </Text>
                                    {paymentMethod === 'wallet' && (
                                        <Text style={styles.paymentSubText}>
                                            –{fareEstimate?.discount ?? pricing?.wallet_discount ?? 5}% appliqué
                                        </Text>
                                    )}
                                </View>

                                <Ionicons
                                    name={showPaymentMethods ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color={COLORS.textSecondary}
                                />
                            </TouchableOpacity>

                            </View>

                            {/* Night surcharge detail */}
                            {fareEstimate?.isNight && (
                                <View style={styles.nightSurchargeRow}>
                                    <Ionicons name="moon" size={13} color="#7B61FF" />
                                    <Text style={styles.nightSurchargeText}>
                                        Majoration nuit · +{fareEstimate.nightPct}% inclus dans le tarif
                                    </Text>
                                </View>
                            )}

                            {/* Smart pricing badges (non-night) */}
                            {fareEstimate?.badges?.filter(b => !b.startsWith('Nuit')).length > 0 && (
                                <View style={styles.badgesRow}>
                                    {fareEstimate.badges.filter(b => !b.startsWith('Nuit')).map((b, i) => (
                                        <View key={i} style={styles.badge}>
                                            <Text style={styles.badgeText}>{b}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* ── Coupon code ── */}
                            {!couponResult ? (
                                <View style={styles.couponRow}>
                                    <Ionicons name="ticket-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.couponInput}
                                        placeholder="Code promo"
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={couponCode}
                                        onChangeText={text => { setCouponCode(text); setCouponError(null); }}
                                        autoCapitalize="characters"
                                        returnKeyType="done"
                                        onSubmitEditing={handleApplyCoupon}
                                    />
                                    <TouchableOpacity
                                        style={[styles.couponApplyBtn, (!couponCode.trim() || couponLoading) && { opacity: 0.5 }]}
                                        onPress={handleApplyCoupon}
                                        disabled={!couponCode.trim() || couponLoading}
                                    >
                                        {couponLoading
                                            ? <ActivityIndicator size="small" color="#fff" />
                                            : <Text style={styles.couponApplyText}>Appliquer</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.couponSuccess}>
                                    <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                        <Text style={styles.couponSuccessTitle}>
                                            Code « {couponCode.toUpperCase()} » appliqué
                                        </Text>
                                        <Text style={styles.couponSuccessDesc}>
                                            {couponResult.description
                                                ?? (couponResult.type === 'free_ride'
                                                    ? 'Trajet gratuit !'
                                                    : `–${couponResult.discount} XAF sur votre course`)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => { setCouponResult(null); setCouponCode(''); }}>
                                        <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            {couponError && (
                                <Text style={styles.couponError}>{couponError}</Text>
                            )}

                            {/* Request button */}
                            <TouchableOpacity
                                style={[styles.requestButton, loading && styles.requestButtonDisabled]}
                                onPress={handleRequestRide}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={COLORS.textLight} />
                                ) : (
                                    <>
                                        <Text style={styles.requestButtonText}>Demander un taxi</Text>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            {couponResult ? (
                                                <>
                                                    <Text style={[styles.requestButtonPrice, { textDecorationLine: 'line-through', opacity: 0.6, fontSize: FONT_SIZES.sm }]}>
                                                        {fareEstimate.total} {fareEstimate.currency}
                                                    </Text>
                                                    <Text style={styles.requestButtonPrice}>
                                                        {couponResult.final_fare} {fareEstimate.currency}
                                                    </Text>
                                                </>
                                            ) : paymentMethod === 'wallet' && fareEstimate.walletTotal ? (
                                                <>
                                                    <Text style={[styles.requestButtonPrice, { textDecorationLine: 'line-through', opacity: 0.6, fontSize: FONT_SIZES.sm }]}>
                                                        {fareEstimate.total} {fareEstimate.currency}
                                                    </Text>
                                                    <Text style={styles.requestButtonPrice}>
                                                        {fareEstimate.walletTotal} {fareEstimate.currency}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text style={styles.requestButtonPrice}>
                                                    {fareEstimate.total} {fareEstimate.currency}
                                                </Text>
                                            )}
                                        </View>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView></KeyboardAvoidingView>
            </Animated.View>

            {/* ── Payment method modal ── */}
            <Modal
                visible={showPaymentMethods}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setShowPaymentMethods(false)}
            >
                {/* Backdrop */}
                <TouchableOpacity
                    style={styles.paymentModalBackdrop}
                    activeOpacity={1}
                    onPress={() => setShowPaymentMethods(false)}
                />
                {/* Sheet */}
                <View style={[styles.paymentModalSheet, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.paymentModalHandle} />
                    <Text style={styles.paymentModalTitle}>Mode de paiement</Text>
                    <PaymentMethodCard method="wallet"       selected={paymentMethod === 'wallet'}       onSelect={(m) => { setPaymentMethod(m); setShowPaymentMethods(false); }} style={styles.paymentCardItem} />
                    <PaymentMethodCard method="cash"         selected={paymentMethod === 'cash'}         onSelect={(m) => { setPaymentMethod(m); setShowPaymentMethods(false); }} style={styles.paymentCardItem} />
                    <PaymentMethodCard method="airtel_money" selected={paymentMethod === 'airtel_money'} onSelect={(m) => { setPaymentMethod(m); setShowPaymentMethods(false); }} style={styles.paymentCardItem} />
                    <PaymentMethodCard method="moov_money"   selected={paymentMethod === 'moov_money'}   onSelect={(m) => { setPaymentMethod(m); setShowPaymentMethods(false); }} style={styles.paymentCardItem} />
                    <PaymentMethodCard method="bank_card"    selected={paymentMethod === 'bank_card'}    onSelect={(m) => { setPaymentMethod(m); setShowPaymentMethods(false); }} />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: SPACING.md,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.md,
    },
    // Map action buttons — grouped top-right, clear of the panel
    mapBtns: {
        position: 'absolute',
        top: 60,
        right: SPACING.md,
        gap: 8,
    },
    mapTypeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#fff',
        paddingVertical: 9,
        paddingHorizontal: 13,
        borderRadius: 22,
        ...SHADOWS.md,
    },
    mapTypeBtnActive: { backgroundColor: '#1C2E4A' },
    mapTypeBtnLabel: { fontSize: 12, fontWeight: '700', color: '#1C2E4A' },
    locateBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        ...SHADOWS.md,
    },
    routeLoadingBadge: {
        position: 'absolute',
        top: 50,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        ...SHADOWS.md,
    },
    routeLoadingText: {
        marginLeft: 8,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    markerPickup: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.secondary,
        borderWidth: 3,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerDropoff: {
        alignItems: 'center',
    },
    // Panel: position absolute, bottom controlled by Animated.Value
    panel: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: COLORS.secondary,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.xl,
        maxHeight: SCREEN_HEIGHT * 0.65,
        ...SHADOWS.lg,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.gray300,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: SPACING.sm,
    },
    section: {
        marginBottom: 8,
    },
    locationInputContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: 10,
    },
    locationDots: {
        alignItems: 'center',
        marginRight: SPACING.sm,
        paddingTop: 6,
    },
    dotPickup: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    dotLine: {
        width: 2,
        height: 28,
        backgroundColor: COLORS.gray300,
        marginVertical: 3,
    },
    dotDropoff: {
        width: 8,
        height: 8,
        backgroundColor: COLORS.primary,
    },
    locationInputs: {
        flex: 1,
    },
    locationInput: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        paddingVertical: 5,
    },
    inputDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 2,
    },
    suggestionsBox: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    suggestionText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        lineHeight: 18,
    },
    mapHint: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#EEF4FF', borderWidth: 1.5, borderColor: COLORS.primary,
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
        marginTop: 6,
    },
    mapHintText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#1C2E4A' },
    routeInfo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    routeInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeInfoText: {
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    paymentSelectorLogo: {
        width:       52,
        height:      36,
        marginRight: SPACING.sm,
    },
    paymentSelectorIcon: {
        width:          40,
        height:         40,
        borderRadius:   10,
        justifyContent: 'center',
        alignItems:     'center',
        marginRight:    SPACING.sm,
    },
    paymentSelectorInfo: {
        flex:       1,
        marginLeft: SPACING.sm,
    },
    paymentSubText: {
        fontSize:   FONT_SIZES.xs,
        color:      '#43A047',
        fontWeight: '600',
        marginTop:  1,
    },
    paymentWrap: {
        marginBottom: 6,
    },
    paymentSelector: {
        flexDirection:   'row',
        alignItems:      'center',
        padding:         10,
        backgroundColor: '#fff',
        borderRadius:    BORDER_RADIUS.lg,
        borderWidth:     1.5,
        borderColor:     '#E8E8E8',
        ...SHADOWS.sm,
    },
    paymentText: {
        fontSize:   FONT_SIZES.md,
        fontWeight: '700',
        color:      COLORS.textPrimary,
    },
    paymentCardItem: {
        marginBottom: 6,
    },
    /* Payment modal */
    paymentModalBackdrop: {
        flex:            1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    paymentModalSheet: {
        backgroundColor:     '#fff',
        borderTopLeftRadius:  24,
        borderTopRightRadius: 24,
        padding:              20,
        paddingTop:           12,
        shadowColor:          '#000',
        shadowOffset:         { width: 0, height: -4 },
        shadowOpacity:        0.12,
        shadowRadius:         16,
        elevation:            24,
    },
    paymentModalHandle: {
        width:         40,
        height:        4,
        borderRadius:  2,
        backgroundColor: '#E0E0E0',
        alignSelf:     'center',
        marginBottom:  16,
    },
    paymentModalTitle: {
        fontSize:     15,
        fontWeight:   '800',
        color:        '#1C2E4A',
        marginBottom: 14,
    },
    requestButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: 6,
        ...SHADOWS.md,
    },
    requestButtonDisabled: {
        opacity: 0.6,
    },
    requestButtonText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.textLight,
    },
    requestButtonPrice: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.textLight,
    },
    // ── Fare type selector ───────────────────────────────────────────────────
    fareTypeRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: 6,
        marginTop: 6,
    },
    fareTypeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    fareTypeBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    fareTypeBtnText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    fareTypeBtnTextActive: {
        color: '#fff',
    },
    // ── Hours picker ─────────────────────────────────────────────────────────
    hoursPickerWrap: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },
    hoursPickerLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    hoursPickerRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    hourBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        alignItems: 'center',
        backgroundColor: COLORS.secondary,
    },
    hourBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    hourBtnText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    hourBtnTextActive: {
        color: '#fff',
    },
    hourRateHint: {
        marginTop: SPACING.sm,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 16,
    },
    nightSurchargeRow: {
        flexDirection:   'row',
        alignItems:      'center',
        gap:             6,
        backgroundColor: '#F3F0FF',
        borderRadius:    8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom:    SPACING.sm,
    },
    nightSurchargeText: {
        fontSize:   FONT_SIZES.xs,
        fontWeight: '600',
        color:      '#5E35B1',
        flex:       1,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: SPACING.sm,
    },
    badge: {
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: '#FFA726',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: '#E65100',
    },
    // ── Coupon ───────────────────────────────────────────────────────────────
    couponRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        marginBottom: 6,
    },
    couponInput: {
        flex: 1,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        paddingVertical: 6,
        letterSpacing: 1,
    },
    couponApplyBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: BORDER_RADIUS.md,
        marginLeft: 8,
    },
    couponApplyText: {
        color: '#fff',
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
    },
    couponSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: '#A5D6A7',
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        marginBottom: SPACING.sm,
    },
    couponSuccessTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: '#2E7D32',
    },
    couponSuccessDesc: {
        fontSize: FONT_SIZES.xs,
        color: '#388E3C',
        marginTop: 2,
    },
    couponError: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.error ?? '#D32F2F',
        marginBottom: SPACING.sm,
        marginLeft: 4,
    },
});

export default RideRequestScreen;
