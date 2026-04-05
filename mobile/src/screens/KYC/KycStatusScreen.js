import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api.service';
import socketService from '../../services/socket.service';

const STATUS_CONFIG = {
    draft: {
        icon: 'create-outline',
        color: '#888',
        bg: '#F5F5F5',
        title: 'Dossier incomplet',
        desc: 'Votre dossier n\'a pas encore été soumis.',
    },
    submitted: {
        icon: 'paper-plane',
        color: '#0288D1',
        bg: '#EEF8FF',
        title: 'Dossier soumis',
        desc: 'Votre dossier a bien été reçu. Notre équipe va l\'étudier sous 24–48h.',
    },
    under_review: {
        icon: 'search',
        color: '#F57F17',
        bg: '#FFF8E1',
        title: 'En cours de vérification',
        desc: 'Votre dossier est en cours d\'examen par notre équipe de conformité.',
    },
    appointment_scheduled: {
        icon: 'calendar',
        color: '#7B1FA2',
        bg: '#F3E5F5',
        title: 'Rendez-vous confirmé',
        desc: 'Un rendez-vous en agence a été planifié. Vérifiez vos notes ci-dessous.',
    },
    approved: {
        icon: 'checkmark-circle',
        color: '#2E7D32',
        bg: '#E8F5E9',
        title: 'Approuvé !',
        desc: 'Félicitations ! Votre dossier a été validé. Le service est maintenant actif sur votre compte.',
    },
    rejected: {
        icon: 'close-circle',
        color: '#C62828',
        bg: '#FFEBEE',
        title: 'Dossier refusé',
        desc: 'Votre dossier n\'a pas été approuvé. Consultez le motif ci-dessous.',
    },
};

const STEPS_DRIVER = [
    { status: 'submitted',             label: 'Dossier soumis' },
    { status: 'under_review',          label: 'Vérification en cours' },
    { status: 'appointment_scheduled', label: 'Rendez-vous agence' },
    { status: 'approved',              label: 'Service activé' },
];

const STEPS_CAR = [
    { status: 'submitted',    label: 'Dossier soumis' },
    { status: 'under_review', label: 'Vérification en cours' },
    { status: 'approved',     label: 'Voiture listée' },
];

const STEPS_MERCHANT = [
    { status: 'submitted',    label: 'Dossier soumis' },
    { status: 'under_review', label: 'Vérification en cours' },
    { status: 'approved',     label: 'Compte marchand activé' },
];

export default function KycStatusScreen({ navigation, route }) {
    const { type } = route.params || {};
    const [verification, setVerification] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    // Refresh when admin changes status in real time
    useEffect(() => {
        const handleChange = () => load();
        socketService.on('kyc_status_changed', handleChange);
        return () => socketService.off('kyc_status_changed', handleChange);
    }, [type]);

    const load = async () => {
        try {
            if (type === 'driver') {
                const res = await api.get('/verifications/driver/me');
                setVerification(res.data.verification);
            } else if (type === 'fleet') {
                const res = await api.get('/verifications/fleet/me');
                setVerification(res.data.verification);
            } else if (type === 'merchant') {
                const res = await api.get('/verifications/merchant/me');
                setVerification(res.data.verifications?.[0] || null);
            } else if (type === 'courier') {
                const res = await api.get('/verifications/courier/me');
                setVerification(res.data.verification || null);
            } else {
                const res = await api.get('/verifications/car/me');
                setVerification(res.data.verifications?.[0] || null);
            }
        } catch (_) {}
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#1C2E4A" style={{ marginTop: 60 }} />
            </SafeAreaView>
        );
    }

    const status = verification?.status || 'draft';
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
    const steps  = type === 'driver' ? STEPS_DRIVER : (type === 'merchant' || type === 'fleet' || type === 'courier') ? STEPS_MERCHANT : STEPS_CAR;

    const currentStepIdx = steps.findIndex(s => s.status === status);
    const isRejected = status === 'rejected';
    const isApproved = status === 'approved';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {type === 'driver' ? 'Vérification chauffeur' : type === 'fleet' ? 'Vérification flotte' : type === 'merchant' ? 'Vérification marchand' : type === 'courier' ? 'Vérification coursier' : 'Vérification véhicule'}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status card */}
                <View style={[styles.statusCard, { backgroundColor: config.bg }]}>
                    <View style={[styles.statusIconWrap, { backgroundColor: config.color + '22' }]}>
                        <Ionicons name={config.icon} size={44} color={config.color} />
                    </View>
                    <Text style={[styles.statusTitle, { color: config.color }]}>{config.title}</Text>
                    <Text style={styles.statusDesc}>{config.desc}</Text>
                </View>

                {/* Progress timeline */}
                {!isRejected && (
                    <View style={styles.timeline}>
                        {steps.map((s, i) => {
                            const done    = i < currentStepIdx || isApproved;
                            const current = i === currentStepIdx && !isApproved;
                            return (
                                <View key={s.status} style={styles.timelineRow}>
                                    <View style={styles.timelineLeft}>
                                        <View style={[
                                            styles.timelineDot,
                                            done    && styles.timelineDotDone,
                                            current && styles.timelineDotCurrent,
                                        ]}>
                                            {done
                                                ? <Ionicons name="checkmark" size={12} color="#fff" />
                                                : <View style={[styles.timelineDotInner, current && { backgroundColor: '#FFA726' }]} />
                                            }
                                        </View>
                                        {i < steps.length - 1 && (
                                            <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.timelineLabel,
                                        done    && styles.timelineLabelDone,
                                        current && styles.timelineLabelCurrent,
                                    ]}>{s.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Appointment info */}
                {status === 'appointment_scheduled' && verification?.appointment_date && (
                    <View style={styles.apptCard}>
                        <Ionicons name="calendar" size={20} color="#7B1FA2" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.apptTitle}>Votre rendez-vous</Text>
                            <Text style={styles.apptLine}>{new Date(verification.appointment_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                            {verification.office_location && <Text style={styles.apptLine}>{verification.office_location}</Text>}
                        </View>
                    </View>
                )}

                {/* Admin notes */}
                {verification?.admin_notes && (
                    <View style={styles.notesCard}>
                        <Text style={styles.notesTitle}>Message de notre équipe</Text>
                        <Text style={styles.notesText}>{verification.admin_notes}</Text>
                    </View>
                )}

                {/* Rejection reason */}
                {isRejected && verification?.rejection_reason && (
                    <View style={[styles.notesCard, { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }]}>
                        <Text style={[styles.notesTitle, { color: '#C62828' }]}>Motif du refus</Text>
                        <Text style={[styles.notesText, { color: '#C62828' }]}>{verification.rejection_reason}</Text>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                    {status === 'draft' && (
                        <TouchableOpacity
                            style={[styles.restartBtn, { backgroundColor: '#FFA726' }]}
                            onPress={() => navigation.replace(
                                type === 'driver'   ? 'DriverKyc'   :
                                type === 'fleet'    ? 'FleetKyc'    :
                                type === 'merchant' ? 'MerchantKyc' :
                                type === 'courier'  ? 'CourierKyc'  : 'CarKyc'
                            )}
                        >
                            <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.restartBtnText}>Continuer mon dossier</Text>
                        </TouchableOpacity>
                    )}
                    {isRejected && (
                        <TouchableOpacity
                            style={styles.restartBtn}
                            onPress={() => navigation.replace(
                                type === 'driver'   ? 'DriverKyc'   :
                                type === 'fleet'    ? 'FleetKyc'    :
                                type === 'merchant' ? 'MerchantKyc' :
                                type === 'courier'  ? 'CourierKyc'  : 'CarKyc'
                            )}
                        >
                            <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.restartBtnText}>Soumettre un nouveau dossier</Text>
                        </TouchableOpacity>
                    )}
                    {isApproved && (
                        <TouchableOpacity
                            style={[styles.restartBtn, { backgroundColor: '#2E7D32' }]}
                            onPress={() => navigation.navigate('HubTabs')}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.restartBtnText}>Accéder au service</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.backToHub} onPress={() => navigation.navigate('HubTabs')}>
                        <Text style={styles.backToHubText}>Retour à l'accueil</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:     { flex: 1, backgroundColor: '#fff' },
    header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitle:   { fontSize: 16, fontWeight: '700', color: '#1C2E4A' },
    content:       { padding: 20, paddingBottom: 40 },

    statusCard:    { borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 24 },
    statusIconWrap:{ width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    statusTitle:   { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    statusDesc:    { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },

    timeline:      { marginBottom: 20 },
    timelineRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
    timelineLeft:  { alignItems: 'center', width: 30, marginRight: 14 },
    timelineDot:   { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#eee' },
    timelineDotDone:   { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    timelineDotCurrent:{ backgroundColor: '#FFF8EE', borderColor: '#FFA726' },
    timelineDotInner:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc' },
    timelineLine:  { width: 2, flex: 1, minHeight: 24, backgroundColor: '#eee', marginVertical: 3 },
    timelineLineDone: { backgroundColor: '#2E7D32' },
    timelineLabel: { fontSize: 14, color: '#aaa', paddingVertical: 3, fontWeight: '500', marginBottom: 20 },
    timelineLabelDone:    { color: '#2E7D32', fontWeight: '600' },
    timelineLabelCurrent: { color: '#1C2E4A', fontWeight: '700' },

    apptCard:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F3E5F5', borderRadius: 12, padding: 14, marginBottom: 16 },
    apptTitle:   { fontSize: 13, fontWeight: '700', color: '#7B1FA2', marginBottom: 4 },
    apptLine:    { fontSize: 13, color: '#555', marginBottom: 2 },

    notesCard:   { borderWidth: 1, borderColor: '#E8EAF0', borderRadius: 12, padding: 14, marginBottom: 16, backgroundColor: '#FAFAFA' },
    notesTitle:  { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    notesText:   { fontSize: 14, color: '#333', lineHeight: 20 },

    actions:         { marginTop: 8, gap: 10 },
    restartBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C2E4A', paddingVertical: 16, borderRadius: 14 },
    restartBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
    backToHub:       { alignItems: 'center', paddingVertical: 14 },
    backToHubText:   { color: '#aaa', fontSize: 14, fontWeight: '500' },
});
