import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, RefreshControl, Alert, Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { rentalAPI } from '../../services/api.service';
import socketService from '../../services/socket.service';

const NAVY   = '#1C2E4A';
const TEAL   = '#00897B';
const ORANGE = '#FFA726';

const STATUS_META = {
    pending_approval: { label: 'En attente',   color: '#F57F17', bg: '#FFF8E1', icon: 'time-outline' },
    available:        { label: 'Disponible',    color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle-outline' },
    rented:           { label: 'En location',   color: '#0288D1', bg: '#E1F3FB', icon: 'car-outline' },
    unavailable:      { label: 'Indisponible',  color: '#888',    bg: '#F5F5F5', icon: 'pause-circle-outline' },
    suspended:        { label: 'Suspendu',      color: '#C62828', bg: '#FFEBEE', icon: 'ban-outline' },
};

const xaf = (n) => Number(n || 0).toLocaleString('fr-FR') + ' XAF';

// ── Car card ──────────────────────────────────────────────────────────────────

function CarCard({ car, onEdit, onDelete, onToggle, onBookings }) {
    const sm = STATUS_META[car.status] || STATUS_META.unavailable;
    const pendingBookings = (car.bookings || []).filter(b => b.status === 'requested').length;
    const canToggle = ['available', 'unavailable'].includes(car.status);

    return (
        <View style={styles.card}>
            {/* Car header */}
            <View style={styles.cardHeader}>
                <View style={styles.carIconWrap}>
                    <Ionicons name="car-sport" size={24} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.carName}>{car.make} {car.model} {car.year}</Text>
                    <Text style={styles.carMeta}>{car.color} · {car.license_plate || car.plate_number || '—'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                        <Ionicons name={sm.icon} size={11} color={sm.color} />
                        <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
                    </View>
                </View>
                {canToggle && (
                    <Switch
                        value={car.status === 'available'}
                        onValueChange={() => onToggle(car)}
                        trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
                        thumbColor={car.status === 'available' ? '#2E7D32' : '#fff'}
                        ios_backgroundColor="#E0E0E0"
                    />
                )}
            </View>

            {/* Pending bookings banner */}
            {pendingBookings > 0 && (
                <TouchableOpacity style={styles.pendingBanner} onPress={onBookings} activeOpacity={0.8}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.pendingText}>
                        {pendingBookings} demande{pendingBookings > 1 ? 's' : ''} de réservation en attente
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={ORANGE} />
                </TouchableOpacity>
            )}

            {/* Price */}
            <View style={styles.priceRow}>
                <View style={styles.priceChip}>
                    <Text style={styles.priceValue}>{xaf(car.price_per_day)}</Text>
                    <Text style={styles.priceUnit}>/jour</Text>
                </View>
                {car.price_per_hour > 0 && (
                    <View style={[styles.priceChip, { backgroundColor: '#F5F9FF' }]}>
                        <Text style={[styles.priceValue, { color: '#0288D1' }]}>{xaf(car.price_per_hour)}</Text>
                        <Text style={styles.priceUnit}>/heure</Text>
                    </View>
                )}
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
                    <Ionicons name="create-outline" size={16} color={NAVY} />
                    <Text style={styles.actionText}>Modifier</Text>
                </TouchableOpacity>
                <View style={styles.actionDivider} />
                <TouchableOpacity style={styles.actionBtn} onPress={onBookings}>
                    <Ionicons name="calendar-outline" size={16} color={TEAL} />
                    <Text style={[styles.actionText, { color: TEAL }]}>Réservations</Text>
                </TouchableOpacity>
                <View style={styles.actionDivider} />
                <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
                    <Ionicons name="trash-outline" size={16} color="#C62828" />
                    <Text style={[styles.actionText, { color: '#C62828' }]}>Retirer</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MyRentalCarsScreen({ navigation }) {
    const { user }   = useAuth();
    const insets     = useSafeAreaInsets();
    const [cars,       setCars]       = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // KYC guard — only active_services (set exclusively by admin approval)
    const isVerified = user?.active_services?.includes('rental_owner');

    const load = useCallback(async () => {
        try {
            const res = await rentalAPI.getMyCars();
            setCars(res.data?.cars || []);
        } catch (_) {}
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const onApproved  = () => load();
        const onSuspended = () => load();
        socketService.on('rental_car_approved',  onApproved);
        socketService.on('rental_car_suspended', onSuspended);
        return () => {
            socketService.off('rental_car_approved',  onApproved);
            socketService.off('rental_car_suspended', onSuspended);
        };
    }, [load]);

    const handleToggle = async (car) => {
        try {
            await rentalAPI.toggleCarAvailability(car.id);
            load();
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de modifier la disponibilité.');
        }
    };

    const handleDelete = (car) => {
        Alert.alert(
            'Retirer l\'annonce',
            `Retirer ${car.make} ${car.model} des annonces de location ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Retirer', style: 'destructive', onPress: async () => {
                    try { await rentalAPI.deleteCar(car.id); load(); }
                    catch (e) { Alert.alert('Erreur', e.response?.data?.error || 'Échec de la suppression.'); }
                }},
            ]
        );
    };

    // ── KYC guard ─────────────────────────────────────────────────────────────

    if (!isVerified) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color={NAVY} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Louer mon véhicule</Text>
                    <View style={{ width: 22 }} />
                </View>

                <View style={styles.kycWrap}>
                    <View style={[styles.kycCard, { backgroundColor: '#F3FFFD' }]}>
                        <View style={[styles.kycIconWrap, { backgroundColor: '#D4F5F2' }]}>
                            <Ionicons name="car-sport" size={48} color={TEAL} />
                        </View>
                        <Text style={styles.kycTitle}>Vérification requise</Text>
                        <Text style={styles.kycSub}>
                            Pour mettre votre véhicule en location sur Ombia, vous devez d'abord faire vérifier votre véhicule (documents + photos).
                        </Text>
                        <View style={styles.kycSteps}>
                            {[
                                'Renseignez les informations de votre véhicule',
                                'Uploadez les documents officiels (carte grise, assurance…)',
                                'Ajoutez des photos de qualité',
                                'Notre équipe valide sous 24–48h',
                            ].map((s, i) => (
                                <View key={i} style={styles.kycStepRow}>
                                    <View style={styles.kycStepNum}>
                                        <Text style={styles.kycStepNumText}>{i + 1}</Text>
                                    </View>
                                    <Text style={styles.kycStepText}>{s}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.kycBtn, { backgroundColor: TEAL }]}
                            onPress={() => navigation.replace('ServiceActivation', { serviceKey: 'rental_owner' })}
                        >
                            <Ionicons name="document-text-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.kycBtnText}>Commencer la vérification</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ marginTop: 12 }}
                            onPress={() => navigation.navigate('KycStatus', { type: 'car' })}
                        >
                            <Text style={{ color: TEAL, fontSize: 13, fontWeight: '600' }}>
                                Voir l'état de mon dossier →
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // ── Verified owner UI ─────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerAccent} />
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
                        <Ionicons name="arrow-back" size={22} color={NAVY} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mes véhicules en location</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('RegisterRentalCar')}
                >
                    <Ionicons name="add" size={22} color={ORANGE} />
                </TouchableOpacity>
            </View>

            {/* Summary bar */}
            {cars.length > 0 && (
                <View style={styles.summaryBar}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryVal}>{cars.length}</Text>
                        <Text style={styles.summaryLbl}>Véhicule{cars.length > 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryVal, { color: '#2E7D32' }]}>
                            {cars.filter(c => c.status === 'available').length}
                        </Text>
                        <Text style={styles.summaryLbl}>Disponible{cars.filter(c => c.status === 'available').length > 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryVal, { color: '#0288D1' }]}>
                            {cars.filter(c => c.status === 'rented').length}
                        </Text>
                        <Text style={styles.summaryLbl}>En location</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <TouchableOpacity style={styles.summaryItem} onPress={() => navigation.navigate('ReceivedBookings')}>
                        <Text style={[styles.summaryVal, { color: ORANGE }]}>
                            {cars.reduce((acc, c) => acc + (c.bookings || []).filter(b => b.status === 'requested').length, 0)}
                        </Text>
                        <Text style={styles.summaryLbl}>Demandes</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={cars}
                renderItem={({ item }) => (
                    <CarCard
                        car={item}
                        onEdit={() => navigation.navigate('EditRentalCar', { car: item })}
                        onDelete={() => handleDelete(item)}
                        onToggle={handleToggle}
                        onBookings={() => navigation.navigate('ReceivedBookings')}
                    />
                )}
                keyExtractor={c => c.id}
                contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[TEAL]} />
                }
                ListEmptyComponent={!loading && (
                    <View style={styles.empty}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="car-sport-outline" size={44} color="#ccc" />
                        </View>
                        <Text style={styles.emptyTitle}>Aucun véhicule listé</Text>
                        <Text style={styles.emptySub}>
                            Ajoutez votre premier véhicule pour commencer à générer des revenus passifs.
                        </Text>
                        <TouchableOpacity
                            style={[styles.kycBtn, { backgroundColor: TEAL, marginTop: 20 }]}
                            onPress={() => navigation.navigate('RegisterRentalCar')}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.kycBtnText}>Ajouter un véhicule</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },

    /* Header */
    header: {
        flexDirection:    'row',
        alignItems:       'center',
        justifyContent:   'space-between',
        paddingHorizontal: 16,
        paddingVertical:   12,
        backgroundColor:  '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerLeft:   { flexDirection: 'row', alignItems: 'center' },
    headerAccent: { width: 4, height: 32, borderRadius: 2, backgroundColor: ORANGE, marginRight: 12 },
    headerTitle:  { fontSize: 17, fontWeight: '700', color: NAVY },
    addBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#FFF3E0',
        alignItems: 'center', justifyContent: 'center',
    },

    /* Summary bar */
    summaryBar: {
        flexDirection:    'row',
        backgroundColor:  '#fff',
        paddingVertical:  10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    summaryItem:    { flex: 1, alignItems: 'center' },
    summaryVal:     { fontSize: 18, fontWeight: '800', color: NAVY },
    summaryLbl:     { fontSize: 10, color: '#aaa', fontWeight: '600', marginTop: 1 },
    summaryDivider: { width: 1, backgroundColor: '#F0F0F0', marginHorizontal: 4 },

    /* List */
    list: { padding: 14 },

    /* Card */
    card: {
        backgroundColor: '#fff',
        borderRadius:    16,
        marginBottom:    12,
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 2 },
        shadowOpacity:   0.06,
        shadowRadius:    8,
        elevation:       3,
        overflow:        'hidden',
    },
    cardHeader: {
        flexDirection:  'row',
        alignItems:     'center',
        padding:        14,
        gap:            12,
    },
    carIconWrap: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: '#D4F5F2',
        alignItems: 'center', justifyContent: 'center',
    },
    carName:  { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 2 },
    carMeta:  { fontSize: 11, color: '#aaa', marginBottom: 4 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 20, alignSelf: 'flex-start',
    },
    statusText: { fontSize: 10, fontWeight: '700' },

    /* Pending banner */
    pendingBanner: {
        flexDirection:    'row',
        alignItems:       'center',
        backgroundColor:  '#FFF8E1',
        paddingVertical:   8,
        paddingHorizontal: 14,
        gap:               8,
        borderTopWidth:    1,
        borderBottomWidth: 1,
        borderColor:       '#FFE082',
    },
    pendingDot: {
        width: 7, height: 7, borderRadius: 4,
        backgroundColor: ORANGE,
    },
    pendingText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#E65100' },

    /* Price */
    priceRow: {
        flexDirection: 'row',
        gap:           8,
        paddingHorizontal: 14,
        paddingBottom: 12,
    },
    priceChip: {
        flexDirection:    'row',
        alignItems:       'baseline',
        gap:              3,
        backgroundColor:  '#F3FFFD',
        borderRadius:     8,
        paddingVertical:   4,
        paddingHorizontal: 10,
        borderWidth:       1,
        borderColor:       '#B2DFDB',
    },
    priceValue: { fontSize: 14, fontWeight: '800', color: TEAL },
    priceUnit:  { fontSize: 10, color: '#aaa', fontWeight: '600' },

    /* Card actions */
    cardActions: {
        flexDirection:  'row',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    actionBtn: {
        flex:           1,
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'center',
        paddingVertical: 11,
        gap:            5,
    },
    actionDivider: { width: 1, backgroundColor: '#F0F0F0' },
    actionText: { fontSize: 12, fontWeight: '700', color: NAVY },

    /* Empty */
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyIconWrap: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: '#F5F5F5',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 8 },
    emptySub:   { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },

    /* KYC guard */
    kycWrap: { flex: 1, padding: 20, justifyContent: 'center' },
    kycCard: {
        borderRadius:  20,
        padding:       24,
        alignItems:    'center',
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius:  12,
        elevation:     3,
    },
    kycIconWrap: {
        width: 90, height: 90, borderRadius: 45,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    kycTitle: { fontSize: 20, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 8 },
    kycSub:   { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    kycSteps: { width: '100%', marginBottom: 20 },
    kycStepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    kycStepNum: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: TEAL,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    kycStepNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    kycStepText:    { flex: 1, fontSize: 13, color: '#444', fontWeight: '500' },
    kycBtn: {
        flexDirection:    'row',
        alignItems:       'center',
        justifyContent:   'center',
        paddingVertical:   13,
        paddingHorizontal: 24,
        borderRadius:      12,
        width:             '100%',
        shadowColor:       TEAL,
        shadowOffset:      { width: 0, height: 4 },
        shadowOpacity:     0.3,
        shadowRadius:      8,
        elevation:         4,
    },
    kycBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
