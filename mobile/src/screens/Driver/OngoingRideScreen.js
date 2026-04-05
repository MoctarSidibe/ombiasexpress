import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LeafletMap from '../../components/LeafletMap';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/colors';
import { rideAPI } from '../../services/api.service';
import socketService from '../../services/socket.service';
import locationService from '../../services/location.service';

const OngoingRideScreen = ({ route, navigation }) => {
    const { rideId } = route.params || {};
    const mapRef = useRef(null);
    const [ride,          setRide]          = useState(null);
    const [loading,       setLoading]       = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // ── Actual-distance tracking ──────────────────────────────────────────────
    const lastPosRef       = useRef(null);   // { latitude, longitude }
    const actualDistRef    = useRef(0);      // km accumulated
    const rideStartedRef   = useRef(false);  // true once status = in_progress
    const startTimeRef     = useRef(null);   // Date when in_progress began

    useEffect(() => { fetchRide(); }, [rideId]);

    // Listen for rider cancellation
    useEffect(() => {
        const onCancelled = (data) => {
            if (data?.rideId && data.rideId !== rideId) return;
            Alert.alert(
                'Course annulée',
                'Le passager a annulé la course.',
                [{ text: 'OK', onPress: () => navigation.navigate('DriverHome') }]
            );
        };
        socketService.on('ride_cancelled', onCancelled);
        return () => socketService.off('ride_cancelled', onCancelled);
    }, [rideId]);

    // Real-time location: send to rider + accumulate distance while in_progress
    useEffect(() => {
        if (!rideId || !ride) return;
        const status = ride.status;
        if (status !== 'accepted' && status !== 'driver_arrived' && status !== 'in_progress') return;

        let mounted = true;
        locationService.startWatching((loc) => {
            if (!mounted) return;
            socketService.updateLocation(loc.latitude, loc.longitude, rideId);

            // Accumulate distance only while ride is in progress
            if (rideStartedRef.current && lastPosRef.current) {
                const d = locationService.calculateDistance(
                    lastPosRef.current.latitude,
                    lastPosRef.current.longitude,
                    loc.latitude,
                    loc.longitude
                );
                if (d > 0) actualDistRef.current += d;
            }
            lastPosRef.current = { latitude: loc.latitude, longitude: loc.longitude };
        }).catch(() => {});

        return () => {
            mounted = false;
            locationService.stopWatching();
        };
    }, [rideId, ride?.status]);

    const fetchRide = async () => {
        if (!rideId) return;
        setLoading(true);
        try {
            const res = await rideAPI.getActive();
            const active = res.data?.ride;
            if (active) {
                setRide(active);
            } else {
                const historyRes = await rideAPI.getHistory({ limit: 5 });
                const found = (historyRes.data?.rides || []).find(r => r.id === rideId || r.id === rideId.toString());
                if (found) setRide(found);
            }
        } catch (_) {}
        finally { setLoading(false); }
    };

    const pickup = ride?.pickup_location?.coordinates
        ? { latitude: ride.pickup_location.coordinates[1], longitude: ride.pickup_location.coordinates[0] }
        : null;
    const dropoff = ride?.dropoff_location?.coordinates
        ? { latitude: ride.dropoff_location.coordinates[1], longitude: ride.dropoff_location.coordinates[0] }
        : null;

    useEffect(() => {
        if (pickup && dropoff && mapRef.current) {
            mapRef.current.fitToCoordinates([pickup, dropoff], {
                edgePadding: { top: 80, right: 40, bottom: 220, left: 40 },
                animated: true,
            });
        }
    }, [pickup, dropoff]);

    const handleArrived = () => {
        if (!ride?.rider_id) return;
        socketService.driverArrived(rideId, ride.rider_id);
        setRide(prev => prev ? { ...prev, status: 'driver_arrived' } : null);
    };

    const handleStartRide = async () => {
        setActionLoading(true);
        try {
            await rideAPI.start(rideId);
            rideStartedRef.current = true;
            startTimeRef.current   = new Date();
            actualDistRef.current  = 0;      // reset counter at ride start
            lastPosRef.current     = null;
            setRide(prev => prev ? { ...prev, status: 'in_progress' } : null);
        } catch (error) {
            Alert.alert('Erreur', error.response?.data?.error || 'Impossible de démarrer la course');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompleteRide = async () => {
        setActionLoading(true);
        try {
            const actualDist = actualDistRef.current > 0.05
                ? parseFloat(actualDistRef.current.toFixed(3))
                : null;
            const actualDur  = startTimeRef.current
                ? Math.round((new Date() - startTimeRef.current) / 60000)
                : null;

            const res = await rideAPI.complete(rideId, {
                actual_distance_km:      actualDist,
                actual_duration_minutes: actualDur,
            });

            const finalFare = parseFloat(res.data?.ride?.fare || ride?.fare || 0);

            Alert.alert('Course terminée !', 'Merci pour votre conduite.', [
                {
                    text: 'Paiement Ombia Wallet',
                    onPress: () => navigation.replace('DriverQR', { amount: finalFare, rideId }),
                },
                { text: 'Retour accueil', onPress: () => navigation.navigate('DriverHome') },
            ]);
        } catch (error) {
            Alert.alert('Erreur', error.response?.data?.error || 'Impossible de terminer la course');
        } finally {
            setActionLoading(false);
        }
    };

    if (!rideId) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>Aucune course active</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtnText}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (loading && !ride) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Chargement de la course…</Text>
                </View>
            </SafeAreaView>
        );
    }

    const status      = ride?.status || 'accepted';
    const canArrive   = status === 'accepted';
    const canStart    = status === 'accepted' || status === 'driver_arrived';
    const canComplete = status === 'in_progress';

    const statusLabel = status === 'accepted'       ? 'En route vers le passager'
                      : status === 'driver_arrived'  ? 'En attente du passager'
                      : status === 'in_progress'     ? 'Course en cours'
                      : '';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LeafletMap
                ref={mapRef}
                style={styles.map}
                initialRegion={pickup
                    ? { ...pickup, latitudeDelta: 0.02, longitudeDelta: 0.02 }
                    : { latitude: 0.4162, longitude: 9.4673, latitudeDelta: 0.08, longitudeDelta: 0.08 }
                }
                markers={[
                    ...(pickup  ? [{ id: 'pickup',  coordinate: pickup,  type: 'pickup',  title: 'Départ'  }] : []),
                    ...(dropoff ? [{ id: 'dropoff', coordinate: dropoff, type: 'dropoff', title: 'Arrivée' }] : []),
                ]}
                polylines={pickup && dropoff ? [{ id: 'route', coordinates: [pickup, dropoff], color: COLORS.primary, width: 4 }] : []}
            />

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            <View style={styles.panel}>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{statusLabel}</Text>
                </View>

                {ride?.rider && (
                    <View style={styles.riderRow}>
                        <View style={styles.riderAvatar}>
                            <Ionicons name="person" size={28} color={COLORS.primary} />
                        </View>
                        <View style={styles.riderInfo}>
                            <Text style={styles.riderName}>{ride.rider.name || 'Passager'}</Text>
                            {ride.rider.rating != null && (
                                <View style={styles.ratingRow}>
                                    <Ionicons name="star" size={14} color="#FFD700" />
                                    <Text style={styles.ratingText}>{ride.rider.rating}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                <View style={styles.addressRow}>
                    <View style={styles.dotP} />
                    <Text style={styles.addressText} numberOfLines={1}>
                        {ride?.pickup_address || 'Départ'}
                    </Text>
                </View>
                <View style={styles.addressRow}>
                    <View style={styles.dotD} />
                    <Text style={styles.addressText} numberOfLines={1}>
                        {ride?.dropoff_address || 'Arrivée prévue'}
                    </Text>
                </View>

                <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Tarif estimé</Text>
                    <Text style={styles.fareValue}>{ride?.fare ?? '0'} XAF</Text>
                </View>

                {/* Live distance counter shown while in_progress */}
                {canComplete && (
                    <View style={styles.distRow}>
                        <Ionicons name="navigate-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.distText}>
                            Distance réelle : recalculée à l'arrivée
                        </Text>
                    </View>
                )}

                <View style={styles.actions}>
                    {canArrive && (
                        <TouchableOpacity style={styles.secondaryButton} onPress={handleArrived} disabled={actionLoading}>
                            <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                            <Text style={styles.secondaryButtonText}>Je suis arrivé</Text>
                        </TouchableOpacity>
                    )}
                    {canStart && (
                        <TouchableOpacity
                            style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
                            onPress={handleStartRide}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <ActivityIndicator color={COLORS.textLight} size="small" /> : (
                                <>
                                    <Ionicons name="play" size={22} color={COLORS.textLight} />
                                    <Text style={styles.primaryButtonText}>Démarrer la course</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                    {canComplete && (
                        <TouchableOpacity
                            style={[styles.completeButton, actionLoading && styles.buttonDisabled]}
                            onPress={handleCompleteRide}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <ActivityIndicator color={COLORS.textLight} size="small" /> : (
                                <>
                                    <Ionicons name="checkmark-done" size={22} color={COLORS.textLight} />
                                    <Text style={styles.primaryButtonText}>Terminer la course</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    map:       { flex: 1 },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
    errorText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginBottom: SPACING.lg },
    loadingText: { marginTop: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
    backBtn: { padding: SPACING.md, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg },
    backBtnText: { color: COLORS.textLight, fontWeight: '600' },
    backButton: {
        position: 'absolute', top: 50, left: SPACING.md,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.md,
    },
    markerPickup: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: COLORS.secondary, borderWidth: 3, borderColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    markerDropoff: { alignItems: 'center' },
    panel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.secondary,
        borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.lg,
    },
    statusBadge: {
        alignSelf: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        backgroundColor: COLORS.gray50, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.md,
    },
    statusText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
    riderRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
    riderAvatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.gray100,
        justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
    },
    riderInfo: { flex: 1 },
    riderName:  { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textPrimary },
    ratingRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    ratingText: { marginLeft: 4, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
    dotP:  { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary,  marginRight: SPACING.sm },
    dotD:  { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent,   marginRight: SPACING.sm },
    addressText: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    fareRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: SPACING.md, borderTopWidth: 1, borderBottomWidth: 1,
        borderColor: COLORS.border, marginBottom: SPACING.sm,
    },
    fareLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
    fareValue: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.primary },
    distRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
    distText:  { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic' },
    actions:   { gap: SPACING.sm },
    secondaryButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: SPACING.md, borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.primary, gap: SPACING.sm,
    },
    secondaryButtonText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.primary },
    primaryButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: SPACING.md, borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.primary, gap: SPACING.sm, ...SHADOWS.md,
    },
    primaryButtonText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textLight },
    completeButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: SPACING.md, borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.success, gap: SPACING.sm, ...SHADOWS.md,
    },
    buttonDisabled: { opacity: 0.6 },
});

export default OngoingRideScreen;
