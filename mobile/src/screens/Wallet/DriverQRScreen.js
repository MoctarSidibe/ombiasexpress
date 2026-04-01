import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import api from '../../services/api.service';

const { width: W } = Dimensions.get('window');

const DriverQRScreen = ({ route, navigation }) => {
    const { amount: initialAmount, rideId, contextId, contextType } = route.params || {};
    const [amount,    setAmount]    = useState(initialAmount ? String(Math.round(initialAmount)) : '');
    const [qrPayload, setQrPayload] = useState(null);
    const [loading,   setLoading]   = useState(false);
    const [expiresIn, setExpiresIn] = useState(0);

    // Countdown timer — regenerates QR on expiry
    useEffect(() => {
        if (!qrPayload) return;
        const iv = setInterval(() => {
            setExpiresIn(prev => {
                if (prev <= 1) { clearInterval(iv); setQrPayload(null); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, [qrPayload]);

    const generateQR = async () => {
        const amt = parseFloat(amount);
        if (!amt || amt < 100) return Alert.alert('Montant invalide', 'Montant minimum : 100 XAF');
        setLoading(true);
        try {
            const res = await api.post('/wallet/generate-payment-qr', {
                amount:       amt,
                ride_id:      rideId || contextId || null,
                context_type: contextType || null,
            });
            setQrPayload(JSON.stringify(res.data.payload));
            setExpiresIn(res.data.expires_in_seconds);
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de générer le QR');
        }
        setLoading(false);
    };

    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Recevoir un Paiement</Text>
                <View style={{ width: 36 }} />
            </View>

            <View style={styles.body}>
                {!qrPayload ? (
                    <>
                        <View style={styles.iconWrap}>
                            <Ionicons name="qr-code-outline" size={64} color="#FFA726" />
                        </View>
                        <Text style={styles.title}>Recevoir un paiement</Text>
                        <Text style={styles.sub}>
                            Générez un QR code sécurisé et partagez-le pour recevoir un paiement Ombia instantané
                        </Text>

                        <Text style={styles.label}>Montant (XAF)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="Ex: 1500"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        <TouchableOpacity style={styles.btn} onPress={generateQR} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="qr-code" size={20} color="#fff" />
                                    <Text style={styles.btnText}>Générer le QR Code</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.title}>Partagez ce QR pour être payé</Text>
                        <Text style={styles.amountLarge}>
                            {parseFloat(amount).toLocaleString('fr-FR')} XAF
                        </Text>

                        <View style={styles.qrWrap}>
                            <QRCode
                                value={qrPayload}
                                size={W * 0.65}
                                color="#1C2E4A"
                                backgroundColor="#fff"
                            />
                        </View>

                        <View style={styles.timerRow}>
                            <Ionicons
                                name="time-outline"
                                size={16}
                                color={expiresIn < 60 ? '#E53935' : '#FFA726'}
                            />
                            <Text style={[styles.timerText, expiresIn < 60 && { color: '#E53935' }]}>
                                Expire dans {fmt(expiresIn)}
                            </Text>
                        </View>

                        <View style={styles.hint}>
                            <Ionicons name="information-circle-outline" size={15} color="#9AA3B0" />
                            <Text style={styles.hintText}>
                                Le QR code est à usage unique et expire dans 10 minutes
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.newBtn} onPress={() => setQrPayload(null)}>
                            <Text style={styles.newBtnText}>Nouveau montant</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: '#F2F4F8' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1C2E4A',
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
    body: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 28,
    },
    iconWrap: {
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: 'rgba(255,167,38,0.12)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    },
    title: {
        fontSize: 20, fontWeight: '800', color: '#1C2E4A',
        marginBottom: 8, textAlign: 'center',
    },
    sub: {
        fontSize: 13, color: '#9AA3B0', textAlign: 'center',
        marginBottom: 32, lineHeight: 20,
    },
    label: {
        alignSelf: 'flex-start', fontSize: 11, fontWeight: '700',
        color: '#6B7280', marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: 0.5,
    },
    input: {
        width: '100%',
        borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 22, fontWeight: '800', color: '#1C2E4A',
        backgroundColor: '#fff', marginBottom: 24, textAlign: 'center',
    },
    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFA726', borderRadius: 16,
        paddingVertical: 16, paddingHorizontal: 32, gap: 8, width: '100%',
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    amountLarge: {
        fontSize: 36, fontWeight: '900', color: '#FFA726', marginBottom: 24,
    },
    qrWrap: {
        backgroundColor: '#fff', borderRadius: 24, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, marginBottom: 20,
    },
    timerRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
    },
    timerText: { fontSize: 14, fontWeight: '600', color: '#FFA726' },
    hint: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, marginBottom: 20,
    },
    hintText: { fontSize: 11, color: '#9AA3B0', flex: 1 },
    newBtn: {
        borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 14,
        paddingVertical: 12, paddingHorizontal: 28,
    },
    newBtnText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
});

export default DriverQRScreen;
