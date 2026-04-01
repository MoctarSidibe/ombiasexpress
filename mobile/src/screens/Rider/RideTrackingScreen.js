import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/colors';
import socketService from '../../services/socket.service';
import { rideAPI } from '../../services/api.service';

const RideTrackingScreen = ({ route, navigation }) => {
    const { rideId } = route.params;
    const mapRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const [ride, setRide] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [eta, setEta] = useState(null);
    const [rideStatus, setRideStatus] = useState('accepted');

    const handleLocationUpdate = useRef(null);
    const handleAccepted       = useRef(null);
    const handleStarted        = useRef(null);
    const handleCompleted      = useRef(null);
    const handleArrived        = useRef(null);

    useEffect(() => {
        fetchRideDetails();
        setupSocketListeners();
        startPulseAnimation();
        return () => {
            if (handleLocationUpdate.current) socketService.off('driver_location_update', handleLocationUpdate.current);
            if (handleAccepted.current)       socketService.off('ride_accepted',          handleAccepted.current);
            if (handleStarted.current)        socketService.off('ride_started',            handleStarted.current);
            if (handleCompleted.current)      socketService.off('ride_completed',          handleCompleted.current);
            if (handleArrived.current)        socketService.off('driver_arrived',          handleArrived.current);
        };
    }, [rideId]);

    const pickupCoords = ride?.pickup_location?.coordinates
        ? { latitude: ride.pickup_location.coordinates[1], longitude: ride.pickup_location.coordinates[0] }
        : null;
    const dropoffCoords = ride?.dropoff_location?.coordinates
        ? { latitude: ride.dropoff_location.coordinates[1], longitude: ride.dropoff_location.coordinates[0] }
        : null;

    // Fit map to show route (driver, pickup, dropoff) - no external API
    useEffect(() => {
        if (!mapRef.current || !pickupCoords) return;
        const coords = [pickupCoords];
        if (dropoffCoords) coords.push(dropoffCoords);
        if (driverLocation) coords.push(driverLocation);
        mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 80, right: 40, bottom: 280, left: 40 },
            animated: true,
        });
    }, [ride?.id, pickupCoords?.latitude, dropoffCoords?.latitude, driverLocation?.latitude]);

    const fetchRideDetails = async () => {
        try {
            const response = await rideAPI.getActive();
            if (response.data.ride) {
                setRide(response.data.ride);
                setRideStatus(response.data.ride.status);
            }
        } catch (_) {}
    };

    const setupSocketListeners = () => {
        handleLocationUpdate.current = (data) => {
            const match = data.ride_id === rideId || data.ride_id === rideId?.toString();
            if (!match) return;
            const lat = data.latitude ?? data.location?.latitude;
            const lng = data.longitude ?? data.location?.longitude;
            if (lat != null && lng != null) setDriverLocation({ latitude: lat, longitude: lng });
            if (data.eta != null) setEta(data.eta);
        };
        handleAccepted.current = (data) => {
            if (data.ride_id === rideId) {
                setRideStatus('accepted');
                setRide((prev) => (prev ? { ...prev, driver: data.driver, vehicle: data.vehicle } : null));
            }
        };
        handleStarted.current = (data) => {
            if (data.ride_id === rideId) setRideStatus('in_progress');
        };
        handleCompleted.current = (data) => {
            if (data.ride_id === rideId) {
                setRideStatus('completed');
                navigation.replace('Rating', { rideId });
            }
        };
        handleArrived.current = (data) => {
            if (data.ride_id === rideId) {
                Alert.alert('Chauffeur arrivé', data.message || 'Votre chauffeur est arrivé !');
            }
        };

        socketService.on('driver_location_update', handleLocationUpdate.current);
        socketService.on('ride_accepted',           handleAccepted.current);
        socketService.on('ride_started',            handleStarted.current);
        socketService.on('ride_completed',          handleCompleted.current);
        socketService.on('driver_arrived',          handleArrived.current);
    };

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const handleCancelRide = () => {
        Alert.alert(
            'Annuler la course',
            'Voulez-vous vraiment annuler cette course ?',
            [
                { text: 'Non', style: 'cancel' },
                {
                    text: 'Oui',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await rideAPI.cancel(rideId, 'Rider cancelled');
                            navigation.goBack();
                        } catch (_) {
                            Alert.alert('Erreur', "Impossible d'annuler la course.");
                        }
                    },
                },
            ]
        );
    };

    const getStatusText = () => {
        switch (rideStatus) {
            case 'accepted':        return 'Votre chauffeur est en route';
            case 'driver_arrived':  return 'Votre chauffeur est arrivé';
            case 'in_progress':     return 'Course en cours';
            default:                return 'Recherche d\'un chauffeur…';
        }
    };

    const displayDriverLocation = driverLocation;

    return (
        <View style={styles.container}>
            {/* Map - no external API; straight-line polylines only */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={
                    pickupCoords
                        ? {
                            latitude: pickupCoords.latitude,
                            longitude: pickupCoords.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }
                        : { latitude: 0.4162, longitude: 9.4673, latitudeDelta: 0.08, longitudeDelta: 0.08 }
                }
                showsUserLocation
                showsMyLocationButton
                provider={PROVIDER_DEFAULT}
            >
                {/* Polyline: driver -> pickup (dashed when en route) */}
                {displayDriverLocation && pickupCoords && (
                    <Polyline
                        coordinates={[displayDriverLocation, pickupCoords]}
                        strokeColor={COLORS.primary}
                        strokeWidth={3}
                        lineDashPattern={[6, 8]}
                    />
                )}
                {/* Polyline: pickup -> dropoff (full route) */}
                {pickupCoords && dropoffCoords && (
                    <Polyline
                        coordinates={[pickupCoords, dropoffCoords]}
                        strokeColor={COLORS.accent}
                        strokeWidth={4}
                    />
                )}

                {/* Driver Marker with pulse animation */}
                {displayDriverLocation && (
                    <Marker coordinate={displayDriverLocation} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={styles.driverMarkerContainer}>
                            <Animated.View
                                style={[
                                    styles.driverPulse,
                                    { transform: [{ scale: pulseAnim }] },
                                ]}
                            />
                            <View style={styles.driverMarker}>
                                <Ionicons name="car" size={24} color={COLORS.secondary} />
                            </View>
                        </View>
                    </Marker>
                )}

                {/* Pickup Marker */}
                {pickupCoords && (
                    <Marker coordinate={pickupCoords}>
                        <View style={styles.pickupMarker}>
                            <Ionicons name="ellipse" size={20} color={COLORS.primary} />
                        </View>
                    </Marker>
                )}
                {/* Dropoff Marker */}
                {dropoffCoords && (
                    <Marker coordinate={dropoffCoords}>
                        <View style={styles.dropoffMarker}>
                            <Ionicons name="location" size={28} color={COLORS.accent} />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Status Card */}
            <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                    <View style={styles.statusIndicator} />
                    <Text style={styles.statusText}>{getStatusText()}</Text>
                </View>

                {eta && (
                    <View style={styles.etaContainer}>
                        <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.etaText}>{eta} min</Text>
                    </View>
                )}

                {ride?.driver && (
                    <View style={styles.driverInfo}>
                        <View style={styles.driverAvatar}>
                            <Ionicons name="person" size={32} color={COLORS.primary} />
                        </View>
                        <View style={styles.driverDetails}>
                            <Text style={styles.driverName}>{ride.driver.name}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={16} color="#FFD700" />
                                <Text style={styles.rating}>{ride.driver.rating}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.callButton}>
                            <Ionicons name="call" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.messageButton}>
                            <Ionicons name="chatbubble" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                )}

                {ride?.vehicle && (
                    <View style={styles.vehicleInfo}>
                        <Ionicons name="car-sport" size={24} color={COLORS.textSecondary} />
                        <Text style={styles.vehicleText}>
                            {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model}
                        </Text>
                        <Text style={styles.vehiclePlate}>{ride.vehicle.license_plate}</Text>
                    </View>
                )}

                {rideStatus === 'accepted' && (
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
                        <Text style={styles.cancelButtonText}>Annuler la course</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    map: {
        flex: 1,
    },
    driverMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    driverPulse: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary + '30',
    },
    driverMarker: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.secondary,
        ...SHADOWS.md,
    },
    pickupMarker: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.secondary,
        borderWidth: 3,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    dropoffMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.secondary,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.lg,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.success,
        marginRight: SPACING.sm,
    },
    statusText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    etaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.gray50,
        borderRadius: BORDER_RADIUS.md,
    },
    etaText: {
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md,
    },
    driverAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        marginLeft: 4,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    messageButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vehicleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
    },
    vehicleText: {
        flex: 1,
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    vehiclePlate: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.gray100,
        borderRadius: BORDER_RADIUS.sm,
    },
    cancelButton: {
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.error,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.error,
    },
});

export default RideTrackingScreen;
