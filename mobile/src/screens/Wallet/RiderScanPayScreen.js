import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../../services/api.service';

const RiderScanPayScreen = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned,       setScanned]       = useState(false);
    const [confirmModal,  setConfirmModal]  = useState(false);
    const [qrData,        setQrData]        = useState(null);
    const [loading,       setLoading]       = useState(false);

    const handleBarCodeScanned = ({ data }) => {
        if (scanned) return;
        try {
            const parsed = JSON.parse(data);
            if (parsed.v !== 1 || !parsed.t || !parsed.a || !parsed.d) {
                Alert.alert('QR invalide', 'Ce QR code n\'est pas un paiement Ombia valide.');
                return;
            }
            setScanned(true);
            setQrData({ raw: data, parsed });
            setConfirmModal(true);
        } catch {
            Alert.alert('Erreur', 'QR code non reconnu — assurez-vous de scanner un QR Ombia.');
        }
    };

    const handlePay = async () => {
        if (!qrData) return;
        setLoading(true);
        try {
            const res = await api.post('/wallet/scan-pay', { qr_data: qrData.raw });
            setConfirmModal(false);
            Alert.alert(
                'Paiement réussi !',
                `${parseFloat(qrData.parsed.a).toLocaleString('fr-FR')} XAF payés avec succès.\n\nNouveau solde : ${parseFloat(res.data.rider_new_balance).toLocaleString('fr-FR')} XAF`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (e) {
            Alert.alert(
                'Paiement échoué',
                e.response?.data?.error || 'Une erreur est survenue, veuillez réessayer.'
            );
            setScanned(false);
            setConfirmModal(false);
        }
        setLoading(false);
    };

    const dismissConfirm = () => {
        setConfirmModal(false);
        setScanned(false);
        setQrData(null);
    };

    // Loading permissions
    if (!permission) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FFA726" />
            </View>
        );
    }

    // Permission not granted
    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.permContainer} edges={['top', 'bottom']}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.permBack}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <View style={styles.center}>
                    <View style={styles.permIcon}>
                        <Ionicons name="camera-outline" size={48} color="#FFA726" />
                    </View>
                    <Text style={styles.permTitle}>Accès caméra requis</Text>
                    <Text style={styles.permSub}>
                        Pour scanner les QR codes de paiement Ombia, l'accès à la caméra est nécessaire.
                    </Text>
                    <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                        <Ionicons name="camera" size={18} color="#fff" />
                        <Text style={styles.btnText}>Autoriser la caméra</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelLinkText}>Annuler</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarCodeScanned}
            />

            {/* Overlay UI */}
            <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
                {/* Top bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.scanTitle}>Scanner & Payer</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Scan area */}
                <View style={styles.scanArea}>
                    {/* Orientation label above frame */}
                    <View style={styles.orientBadge}>
                        <Ionicons name="storefront-outline" size={13} color="rgba(255,255,255,0.9)" style={{ marginRight: 5 }} />
                        <Text style={styles.orientBadgeText}>Scanner & Payer Partenaire</Text>
                    </View>

                    {/* Scan frame */}
                    <View style={styles.scanFrame}>
                        <View style={[styles.corner, styles.tl]} />
                        <View style={[styles.corner, styles.tr]} />
                        <View style={[styles.corner, styles.bl]} />
                        <View style={[styles.corner, styles.br]} />
                        {/* Inner label overlay */}
                        <View style={styles.frameInnerLabel}>
                            <Text style={styles.frameInnerText}>OMBIA PAY</Text>
                        </View>
                    </View>

                    <Text style={styles.scanHint}>
                        Pointez la caméra sur le QR code Ombia du bénéficiaire
                    </Text>
                </View>

                {/* Rescan button if cancelled */}
                {scanned && !confirmModal && (
                    <TouchableOpacity
                        style={styles.rescanBtn}
                        onPress={() => { setScanned(false); setQrData(null); }}
                    >
                        <Ionicons name="refresh" size={16} color="#fff" />
                        <Text style={styles.rescanText}>Scanner à nouveau</Text>
                    </TouchableOpacity>
                )}

                {/* Bottom hint */}
                <View style={styles.bottomHint}>
                    <Ionicons name="wallet-outline" size={16} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.bottomHintText}>Paiement Ombia Wallet</Text>
                </View>
            </SafeAreaView>

            {/* Confirmation bottom sheet */}
            <Modal
                visible={confirmModal}
                transparent
                animationType="slide"
                onRequestClose={dismissConfirm}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />

                        <View style={styles.checkIcon}>
                            <Ionicons name="qr-code" size={32} color="#FFA726" />
                        </View>

                        <Text style={styles.sheetTitle}>Confirmer le paiement</Text>
                        <Text style={styles.sheetSub}>Paiement Ombia Card · Instantané & Sécurisé</Text>

                        {qrData && (
                            <View style={styles.amountBox}>
                                <Text style={styles.amountLabel}>Montant à payer</Text>
                                <Text style={styles.amountValue}>
                                    {parseFloat(qrData.parsed.a).toLocaleString('fr-FR')} XAF
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.payBtn}
                            onPress={handlePay}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                                    <Text style={styles.payBtnText}>Confirmer le paiement</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={dismissConfirm}>
                            <Text style={styles.cancelBtnText}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container:     { flex: 1, backgroundColor: '#000' },
    center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F2F4F8' },
    permContainer: { flex: 1, backgroundColor: '#F2F4F8' },
    permBack:      { padding: 16 },
    permIcon: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(255,167,38,0.12)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    permTitle:   { fontSize: 20, fontWeight: '800', color: '#1C2E4A', marginBottom: 10, textAlign: 'center' },
    permSub:     { fontSize: 13, color: '#9AA3B0', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
    btn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFA726', borderRadius: 16,
        paddingVertical: 14, paddingHorizontal: 28, marginBottom: 12,
    },
    btnText:     { color: '#fff', fontSize: 15, fontWeight: '800' },
    cancelLink:  { paddingVertical: 10 },
    cancelLinkText: { color: '#9AA3B0', fontSize: 14, fontWeight: '600' },

    overlay:   { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    closeBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    scanTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

    scanArea:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scanFrame: {
        width: 240, height: 240, position: 'relative',
        backgroundColor: 'transparent', marginBottom: 24,
    },
    corner:    { position: 'absolute', width: 36, height: 36, borderColor: '#FFA726', borderWidth: 3 },
    tl:        { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
    tr:        { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
    bl:        { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
    br:        { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
    orientBadge: {
        flexDirection:     'row',
        alignItems:        'center',
        backgroundColor:   'rgba(255,167,38,0.22)',
        borderWidth:       1,
        borderColor:       'rgba(255,167,38,0.45)',
        borderRadius:      20,
        paddingHorizontal: 14,
        paddingVertical:   6,
        marginBottom:      18,
    },
    orientBadgeText: {
        color:      'rgba(255,255,255,0.92)',
        fontSize:   12,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    frameInnerLabel: {
        position:       'absolute',
        bottom:         10,
        alignSelf:      'center',
    },
    frameInnerText: {
        color:        'rgba(255,255,255,0.18)',
        fontSize:     22,
        fontWeight:   '900',
        letterSpacing: 6,
        textTransform: 'uppercase',
    },
    scanHint: {
        color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center',
        paddingHorizontal: 48, lineHeight: 20, marginTop: 4,
    },
    rescanBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'center', backgroundColor: '#FFA726',
        borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginBottom: 16,
    },
    rescanText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    bottomHint: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingBottom: 24,
    },
    bottomHintText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 44, alignItems: 'center',
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 20 },
    checkIcon: {
        width: 76, height: 76, borderRadius: 38,
        backgroundColor: 'rgba(255,167,38,0.12)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1C2E4A', marginBottom: 4 },
    sheetSub:   { fontSize: 13, color: '#9AA3B0', marginBottom: 20 },
    amountBox: {
        backgroundColor: '#F2F4F8', borderRadius: 18,
        paddingVertical: 20, paddingHorizontal: 48,
        alignItems: 'center', marginBottom: 24, width: '100%',
    },
    amountLabel: { fontSize: 11, color: '#9AA3B0', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    amountValue: { fontSize: 38, fontWeight: '900', color: '#1C2E4A' },
    payBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFA726', borderRadius: 16,
        paddingVertical: 16, gap: 8, width: '100%', marginBottom: 12,
    },
    payBtnText:    { color: '#fff', fontSize: 16, fontWeight: '800' },
    cancelBtn:     { paddingVertical: 12 },
    cancelBtnText: { color: '#9AA3B0', fontSize: 14, fontWeight: '600' },
});

export default RiderScanPayScreen;
