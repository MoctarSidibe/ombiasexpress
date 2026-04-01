import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api.service';

const fmt = n => Number(n || 0).toLocaleString('fr-FR');

const FleetOwnerHomeScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { active_services } = user || {};
    const firstName = user?.name?.split(' ')[0] || 'Propriétaire';

    const [vehicles,     setVehicles]     = useState([]);
    const [todayRides,   setTodayRides]   = useState(0);
    const [monthEarnings, setMonthEarnings] = useState(0);
    const [refreshing,   setRefreshing]   = useState(false);

    // ── KYC guard ─────────────────────────────────────────────────────────────
    const hasAccess = active_services?.includes('fleet_owner');

    if (!hasAccess) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.blockedWrap}>
                    <View style={styles.blockedIconWrap}>
                        <Ionicons name="shield-checkmark-outline" size={64} color="#FFA726" />
                    </View>
                    <Text style={styles.blockedTitle}>Vérification requise</Text>
                    <Text style={styles.blockedDesc}>
                        Pour rejoindre la Flotte Ombia, vous devez soumettre votre dossier de vérification.
                        Notre équipe examine les documents sous 24–48h.
                    </Text>

                    <View style={styles.blockedSteps}>
                        {[
                            { icon: 'person-outline',       text: 'Informations personnelles + CNI' },
                            { icon: 'car-outline',          text: 'Détails et documents du véhicule' },
                            { icon: 'camera-outline',       text: 'Photos du véhicule (5 angles)' },
                            { icon: 'document-text-outline', text: 'Signature de la convention 70/30' },
                        ].map((s, i) => (
                            <View key={i} style={styles.blockedStep}>
                                <View style={styles.blockedStepIcon}>
                                    <Ionicons name={s.icon} size={18} color="#FFA726" />
                                </View>
                                <Text style={styles.blockedStepText}>{s.text}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.blockedBtn}
                        onPress={() => navigation.navigate('ServiceActivation', { serviceKey: 'fleet_owner' })}
                    >
                        <Ionicons name="document-text" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.blockedBtnText}>Commencer la vérification</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.blockedBtnSecondary}
                        onPress={() => navigation.navigate('KycStatus', { type: 'fleet' })}
                    >
                        <Text style={styles.blockedBtnSecondaryText}>Voir l'état de mon dossier</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Load stats ────────────────────────────────────────────────────────────
    const loadStats = async () => {
        try {
            const [vRes, wRes] = await Promise.allSettled([
                api.get('/vehicles'),
                api.get('/wallet/balance'),
            ]);
            if (vRes.status === 'fulfilled') setVehicles(vRes.value.data?.vehicles || []);
            if (wRes.status === 'fulfilled') setMonthEarnings(wRes.value.data?.balance || 0);

            // Count today's rides (rides where driver is user and created today)
            const today = new Date().toISOString().split('T')[0];
            const rRes = await api.get('/rides/history', { params: { limit: 50 } });
            const rides = rRes.data?.rides || [];
            const todayCount = rides.filter(r =>
                r.status === 'completed' &&
                r.created_at?.startsWith(today)
            ).length;
            setTodayRides(todayCount);
        } catch (_) {}
        finally { setRefreshing(false); }
    };

    useEffect(() => { if (hasAccess) loadStats(); }, [hasAccess]);

    // ── Dashboard ─────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} colors={['#FFA726']} tintColor="#FFA726" />}
            >

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Bonjour, {firstName}</Text>
                        <Text style={styles.subtitle}>Tableau de bord · Flotte Ombia</Text>
                    </View>
                    <View style={styles.badgeFleet}>
                        <Ionicons name="shield-checkmark" size={14} color="#fff" />
                        <Text style={styles.badgeText}>Flotte</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { borderTopColor: '#FFA726' }]}>
                        <Ionicons name="car" size={20} color="#FFA726" />
                        <Text style={styles.statValue}>{vehicles.length}</Text>
                        <Text style={styles.statLabel}>Véhicule{vehicles.length !== 1 ? 's' : ''}{'\n'}enregistré{vehicles.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[styles.statCard, { borderTopColor: '#4DB6E8' }]}>
                        <Ionicons name="navigate" size={20} color="#4DB6E8" />
                        <Text style={styles.statValue}>{todayRides}</Text>
                        <Text style={styles.statLabel}>Courses{'\n'}aujourd'hui</Text>
                    </View>
                    <View style={[styles.statCard, { borderTopColor: '#4CAF50' }]}>
                        <Ionicons name="wallet" size={20} color="#4CAF50" />
                        <Text style={styles.statValue}>{fmt(monthEarnings)}</Text>
                        <Text style={styles.statLabel}>Solde{'\n'}portefeuille</Text>
                    </View>
                </View>

                {/* Add vehicle CTA */}
                <TouchableOpacity
                    style={styles.addCarButton}
                    onPress={() => navigation.navigate('VehicleRegistration')}
                >
                    <Ionicons name="add-circle-outline" size={22} color="#fff" />
                    <Text style={styles.addCarText}>Enregistrer un véhicule dans la flotte</Text>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                {/* How it works */}
                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="shield-checkmark" size={20} color="#FFA726" />
                        <Text style={styles.infoTitle}>Comment ça fonctionne ?</Text>
                    </View>
                    {[
                        { n: '1', icon: 'car-outline',              text: 'Enregistrez votre véhicule dans la flotte Ombia' },
                        { n: '2', icon: 'person-outline',           text: 'Ombia assigne un chauffeur qualifié à votre véhicule' },
                        { n: '3', icon: 'navigate-circle-outline',  text: 'Votre véhicule effectue des courses pour les passagers' },
                        { n: '4', icon: 'wallet-outline',           text: 'Vous percevez 70% sur chaque course réalisée' },
                    ].map(step => (
                        <View key={step.n} style={styles.step}>
                            <View style={styles.stepNum}>
                                <Text style={styles.stepNumText}>{step.n}</Text>
                            </View>
                            <Ionicons name={step.icon} size={18} color="#4DB6E8" style={{ marginHorizontal: 10 }} />
                            <Text style={styles.stepText}>{step.text}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    // ── Blocked ──
    blockedWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
    },
    blockedIconWrap: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FFF8EE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    blockedTitle: { fontSize: 22, fontWeight: '800', color: '#1C2E4A', marginBottom: 12, textAlign: 'center' },
    blockedDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    blockedSteps: { width: '100%', marginBottom: 28 },
    blockedStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    blockedStepIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#FFF8EE', alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    blockedStepText: { flex: 1, fontSize: 14, color: '#555' },
    blockedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFA726',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        width: '100%',
        marginBottom: 12,
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 5,
    },
    blockedBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    blockedBtnSecondary: { paddingVertical: 14 },
    blockedBtnSecondaryText: { color: '#aaa', fontSize: 14, fontWeight: '500' },

    // ── Dashboard ──
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    greeting: { fontSize: 22, fontWeight: '800', color: '#1C2E4A' },
    subtitle:  { fontSize: 13, color: '#aaa', marginTop: 2 },
    badgeFleet: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFA726', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 10,
    },
    statCard: {
        flex: 1, backgroundColor: '#fff',
        borderRadius: 14, padding: 14,
        alignItems: 'center',
        borderTopWidth: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    statValue: { fontSize: 20, fontWeight: '800', color: '#1C2E4A', marginTop: 6 },
    statLabel: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 4, lineHeight: 15 },

    addCarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFA726',
        marginHorizontal: 16,
        borderRadius: 14,
        padding: 16,
        gap: 10,
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 16,
    },
    addCarText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 15 },

    infoCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 14,
        padding: 18,
        marginBottom: 30,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    infoTitle: { fontSize: 15, fontWeight: '800', color: '#1C2E4A' },
    step: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    stepNum: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#FFF8EE',
        borderWidth: 1.5, borderColor: '#FFA726',
        alignItems: 'center', justifyContent: 'center',
    },
    stepNumText: { fontSize: 12, fontWeight: '800', color: '#FFA726' },
    stepText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },
});

export default FleetOwnerHomeScreen;
