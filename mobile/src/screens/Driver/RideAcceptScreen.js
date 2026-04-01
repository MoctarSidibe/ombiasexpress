import { API_BASE } from '../../services/api.service';
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { rideAPI } from '../../services/api.service';

const fullUrl  = url => (!url ? null : url.startsWith('http') ? url : `${API_BASE}${url}`);
const fmt      = n => Number(n || 0).toLocaleString('fr-FR');

const NAVY   = '#1C2E4A';
const GREEN  = '#2E7D32';
const ORANGE = '#FFA726';

// ── Auto-dismiss timer ─────────────────────────────────────────────────────────
const AUTO_DISMISS_SEC = 30;

// ── Rider avatar with initials fallback ───────────────────────────────────────
const getInitials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
const RiderAvatar = ({ photoUrl, name = '', size = 52 }) => {
    const uri = fullUrl(photoUrl);
    if (uri) {
        return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E3F0FF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: NAVY, fontSize: size * 0.36, fontWeight: '800' }}>{getInitials(name) || '?'}</Text>
        </View>
    );
};

export default function RideAcceptScreen({ route, navigation }) {
    const { rideId, rideData } = route.params || {};
    const [loading,   setLoading]   = useState(false);
    const [countdown, setCountdown] = useState(AUTO_DISMISS_SEC);
    const timerRef = useRef(null);

    // Countdown → auto-dismiss
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    navigation.goBack();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    if (!rideId || !rideData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>Aucune demande de course disponible</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtnText}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const { pickup_address, dropoff_address, fare, distance_km, duration_minutes, rider } = rideData;

    const handleAccept = async () => {
        clearInterval(timerRef.current);
        setLoading(true);
        try {
            await rideAPI.accept(rideId);
            navigation.replace('OngoingRide', { rideId });
        } catch (error) {
            Alert.alert('Erreur', error.response?.data?.error || 'Impossible d\'accepter la course');
            setLoading(false);
        }
    };

    const handleDecline = () => {
        clearInterval(timerRef.current);
        navigation.goBack();
    };

    // Progress bar for countdown
    const progress = countdown / AUTO_DISMISS_SEC;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Countdown bar */}
            <View style={styles.countdownBar}>
                <Animated.View style={[styles.countdownFill, { width: `${progress * 100}%` }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleDecline} style={styles.closeBtn}>
                    <Ionicons name="close" size={26} color={NAVY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nouvelle demande de course</Text>
                <View style={styles.timerBadge}>
                    <Text style={styles.timerText}>{countdown}s</Text>
                </View>
            </View>

            {/* Main card */}
            <View style={styles.card}>
                {/* Rider row */}
                {rider && (
                    <View style={styles.riderRow}>
                        <RiderAvatar photoUrl={rider.profile_photo} name={rider.name} size={52} />
                        <View style={styles.riderInfo}>
                            <Text style={styles.riderName}>{rider.name || 'Passager'}</Text>
                            {rider.rating != null && (
                                <View style={styles.ratingRow}>
                                    <Ionicons name="star" size={14} color="#FFD700" />
                                    <Text style={styles.ratingText}>{Number(rider.rating).toFixed(1)}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Route */}
                <View style={styles.routeCard}>
                    <View style={styles.locationRow}>
                        <View style={styles.dotPickup} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.routeLabel}>Départ</Text>
                            <Text style={styles.routeText} numberOfLines={2}>{pickup_address || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.locationRow}>
                        <View style={styles.dotDropoff} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.routeLabel}>Destination</Text>
                            <Text style={styles.routeText} numberOfLines={2}>{dropoff_address || '—'}</Text>
                        </View>
                    </View>
                </View>

                {/* Trip stats */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Ionicons name="navigate-outline" size={18} color="#0288D1" />
                        <Text style={styles.statValue}>{distance_km?.toFixed(1) ?? '—'} km</Text>
                        <Text style={styles.statLabel}>Distance</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Ionicons name="time-outline" size={18} color={ORANGE} />
                        <Text style={styles.statValue}>{duration_minutes ?? '—'} min</Text>
                        <Text style={styles.statLabel}>Durée estimée</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Ionicons name="cash-outline" size={18} color={GREEN} />
                        <Text style={[styles.statValue, { color: GREEN }]}>{fmt(fare)} XAF</Text>
                        <Text style={styles.statLabel}>Tarif</Text>
                    </View>
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.declineBtn, loading && { opacity: 0.5 }]}
                    onPress={handleDecline}
                    disabled={loading}
                >
                    <Ionicons name="close" size={22} color="#C62828" />
                    <Text style={styles.declineBtnText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.acceptBtn, loading && { opacity: 0.5 }]}
                    onPress={handleAccept}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark" size={22} color="#fff" />
                            <Text style={styles.acceptBtnText}>Accepter</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    /* Countdown progress bar */
    countdownBar: { height: 4, backgroundColor: '#E0E0E0', width: '100%' },
    countdownFill: { height: 4, backgroundColor: GREEN },

    /* Header */
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#F5F5F5',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: NAVY },
    timerBadge: {
        backgroundColor: '#FFF8E1', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5,
        borderWidth: 1.5, borderColor: '#FFE082',
    },
    timerText: { fontSize: 14, fontWeight: '800', color: '#E65100' },

    /* Main card */
    card: {
        margin: 16, backgroundColor: '#fff', borderRadius: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
        overflow: 'hidden',
    },

    /* Rider */
    riderRow: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
        gap: 12,
    },
    riderInfo: { flex: 1 },
    riderName: { fontSize: 17, fontWeight: '700', color: NAVY },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
    ratingText: { fontSize: 14, fontWeight: '600', color: '#555' },

    /* Route */
    routeCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    routeDivider: {
        height: 20, width: 2, backgroundColor: '#E0E0E0',
        marginLeft: 6, marginVertical: 4,
    },
    dotPickup:  { width: 14, height: 14, borderRadius: 7, backgroundColor: '#1565C0', marginTop: 4 },
    dotDropoff: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#C62828', marginTop: 4 },
    routeLabel: { fontSize: 10, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
    routeText:  { fontSize: 14, fontWeight: '600', color: NAVY, lineHeight: 20 },

    /* Stats */
    statsRow: { flexDirection: 'row', paddingVertical: 16 },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 15, fontWeight: '800', color: NAVY },
    statLabel: { fontSize: 10, color: '#aaa', fontWeight: '600' },
    statDivider: { width: 1, backgroundColor: '#F0F0F0' },

    /* Actions */
    actions: {
        flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 20, gap: 12,
    },
    declineBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 16, borderRadius: 14,
        borderWidth: 2, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE',
    },
    declineBtnText: { fontSize: 16, fontWeight: '700', color: '#C62828' },
    acceptBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 16, borderRadius: 14,
        backgroundColor: GREEN,
        shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 5,
    },
    acceptBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    /* Error / empty */
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    errorText: { fontSize: 16, color: '#888', marginBottom: 20 },
    backBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: NAVY, borderRadius: 12 },
    backBtnText: { color: '#fff', fontWeight: '700' },
});
