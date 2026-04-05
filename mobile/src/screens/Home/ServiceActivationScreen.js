import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

const SERVICE_CONFIGS = {
    driver: {
        icon: 'car-sport',
        iconColor: '#1C2E4A',
        cardBg: '#F0F4FF',
        title: 'Devenir Chauffeur Ombia',
        desc: 'Conduisez pour Ombia et gagnez à votre rythme',
        benefits: [
            'Revenus flexibles selon vos heures',
            'Paiements rapides sur votre portefeuille',
            'Support chauffeur 24/7',
        ],
        kycScreen: 'DriverKyc',
        kycType:   'driver',
        notice: 'Une vérification d\'identité et un rendez-vous en agence sont requis pour garantir la sécurité de tous.',
    },
    rental_owner: {
        icon: 'cash',
        iconColor: '#0288D1',
        cardBg: '#EEF8FF',
        title: 'Louer mon véhicule',
        desc: 'Mettez votre véhicule en location et générez des revenus passifs',
        benefits: [
            'Vous fixez votre prix par jour',
            'Vous choisissez vos disponibilités',
            'Paiements sécurisés sur votre portefeuille',
        ],
        kycScreen: 'CarKyc',
        kycType:   'car',
        notice: 'Une vérification du véhicule (documents + photos) est requise avant la mise en ligne.',
    },
    fleet_owner: {
        icon: 'shield-checkmark',
        iconColor: '#FFA726',
        cardBg: '#FFF8EE',
        title: 'Rejoindre la Flotte Ombia',
        desc: 'Confiez votre véhicule à Ombia Express',
        benefits: [
            'Revenus garantis (70% par course)',
            'Ombia sélectionne et gère les chauffeurs',
            'Suivi en temps réel de votre véhicule',
            'Paiements automatiques sur votre portefeuille',
        ],
        kycScreen: 'FleetKyc',
        kycType:   'fleet',
        notice: 'Une vérification de votre identité et des documents du véhicule est requise avant intégration dans la flotte.',
    },
    partner: {
        icon: 'storefront',
        iconColor: '#00897B',
        cardBg: '#F3FFFD',
        title: 'Devenir Partenaire Ombia',
        desc: 'Acceptez les paiements Ombia Express dans votre commerce',
        benefits: [
            'QR code unique pour votre commerce',
            'Paiements instantanés sur votre portefeuille',
            'Tableau de bord des transactions',
            'Cashback exclusif pour vos clients',
        ],
        kycScreen: 'MerchantKyc',
        kycType:   'merchant',
        notice: 'Une vérification de votre activité commerciale (RCCM, documents officiels) est requise.',
    },
    car_seller: {
        icon: 'pricetag',
        iconColor: '#7B1FA2',
        cardBg: '#FDF5FF',
        title: 'Vendre des véhicules',
        desc: 'Listez vos véhicules sur le marché Ombia et touchez des acheteurs qualifiés',
        benefits: [
            'Annonces visibles à toute la communauté Ombia',
            'Vérification vendeur pour plus de confiance',
            'Gestion de vos annonces en temps réel',
        ],
        kycScreen: 'MerchantKyc',
        kycType:   'merchant',
        notice: 'Une vérification de votre identité et de vos documents est requise pour publier des annonces.',
    },
    store_owner: {
        icon: 'bag-handle',
        iconColor: '#7B1FA2',
        cardBg: '#FDF5FF',
        title: 'Ouvrir ma boutique en ligne',
        desc: 'Vendez vos produits sur Ombia et gérez vos commandes depuis votre tableau de bord vendeur',
        benefits: [
            'Catalogue produits illimité avec photos',
            'Gestion des commandes & livraisons',
            'Tableau de bord des ventes en temps réel',
            'Visibilité auprès de toute la communauté Ombia',
            'Paiements sécurisés directement sur votre portefeuille',
        ],
        kycScreen: 'MerchantKyc',
        kycType:   'merchant',
        notice: 'Une vérification de votre activité commerciale est requise pour ouvrir votre boutique. Dossier examiné sous 24–48h.',
    },
};

const ServiceActivationScreen = ({ navigation, route }) => {
    const { serviceKey } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [existing, setExisting] = useState(null);  // existing KYC verification

    const config = SERVICE_CONFIGS[serviceKey];

    useEffect(() => {
        if (!config) { setLoading(false); return; }
        // Check if user already has a pending/submitted verification
        const endpointMap = { driver: '/verifications/driver/me', car: '/verifications/car/me', merchant: '/verifications/merchant/me', fleet: '/verifications/fleet/me' };
        const endpoint = endpointMap[config.kycType] || '/verifications/driver/me';
        api.get(endpoint)
            .then(res => {
                const singular = ['driver', 'fleet'].includes(config.kycType);
                const v = singular ? res.data.verification : res.data.verifications?.[0];
                setExisting(v);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [serviceKey]);

    if (!config) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorWrap}>
                    <Text style={styles.errorText}>Service introuvable.</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.errorBack}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const hasExisting = existing && !['rejected'].includes(existing.status);

    const handleStart = () => {
        if (hasExisting) {
            navigation.navigate('KycStatus', { type: config.kycType });
        } else if (config.kycType === 'merchant') {
            navigation.navigate(config.kycScreen, { merchantType: serviceKey });
        } else if (config.kycType === 'fleet') {
            navigation.navigate('FleetKyc');
        } else {
            navigation.navigate(config.kycScreen);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Back button */}
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1C2E4A" />
                </TouchableOpacity>

                {/* Service info card */}
                <View style={[styles.serviceCard, { backgroundColor: config.cardBg }]}>
                    <View style={[styles.iconCircle, { backgroundColor: config.iconColor + '22' }]}>
                        <Ionicons name={config.icon} size={48} color={config.iconColor} />
                    </View>
                    <Text style={styles.serviceTitle}>{config.title}</Text>
                    <Text style={styles.serviceDesc}>{config.desc}</Text>
                </View>

                {/* Benefits */}
                <View style={styles.benefitsSection}>
                    <Text style={styles.benefitsTitle}>Ce que vous obtenez :</Text>
                    {config.benefits.map((benefit, idx) => (
                        <View key={idx} style={styles.benefitRow}>
                            <View style={styles.benefitDot}>
                                <Ionicons name="checkmark" size={14} color="#fff" />
                            </View>
                            <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                    ))}
                </View>

                {/* Notice */}
                <View style={styles.noticeBox}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#4DB6E8" />
                    <Text style={styles.noticeText}>{config.notice}</Text>
                </View>

                {/* Existing verification status banner */}
                {hasExisting && (
                    <View style={[styles.noticeBox, { backgroundColor: '#FFF8E1', marginBottom: 12 }]}>
                        <Ionicons name="time-outline" size={18} color="#F57F17" />
                        <Text style={[styles.noticeText, { color: '#F57F17' }]}>
                            Vous avez déjà un dossier en cours ({
                                existing.status === 'submitted'             ? 'soumis' :
                                existing.status === 'under_review'          ? 'en cours d\'examen' :
                                existing.status === 'appointment_scheduled' ? 'rendez-vous planifié' :
                                existing.status
                            }).
                        </Text>
                    </View>
                )}

                {/* Start / View status button */}
                {loading ? (
                    <ActivityIndicator color="#FFA726" style={{ marginVertical: 20 }} />
                ) : (
                    <TouchableOpacity style={styles.activateBtn} onPress={handleStart}>
                        <Ionicons
                            name={hasExisting ? 'eye' : 'document-text'}
                            size={20} color="#fff"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.activateBtnText}>
                            {hasExisting ? 'Voir l\'état de ma vérification' : 'Commencer la vérification'}
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scroll:    { padding: 20, paddingTop: 12 },

    backButton: { marginBottom: 20 },

    /* ── Service card ── */
    serviceCard: {
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        marginBottom: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    serviceTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1C2E4A',
        textAlign: 'center',
        marginBottom: 8,
    },
    serviceDesc: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },

    /* ── Benefits ── */
    benefitsSection: {
        marginBottom: 20,
    },
    benefitsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C2E4A',
        marginBottom: 14,
        opacity: 0.7,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        borderLeftWidth: 3,
        borderLeftColor: '#FFA726',
        paddingLeft: 8,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    benefitDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFA726',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 1,
        flexShrink: 0,
    },
    benefitText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
        lineHeight: 22,
    },

    /* ── Notice ── */
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#EEF8FF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 28,
    },
    noticeText: {
        flex: 1,
        fontSize: 13,
        color: '#4DB6E8',
        lineHeight: 18,
    },

    /* ── Buttons ── */
    activateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFA726',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 12,
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 5,
    },
    activateBtnDisabled: { opacity: 0.6 },
    activateBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: 14,
        marginBottom: 20,
    },
    cancelBtnText: {
        color: '#aaa',
        fontSize: 15,
        fontWeight: '500',
    },

    /* ── Error state ── */
    errorWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: { fontSize: 16, color: '#888', marginBottom: 12 },
    errorBack: { fontSize: 15, color: '#4DB6E8', fontWeight: '600' },
});

export default ServiceActivationScreen;
