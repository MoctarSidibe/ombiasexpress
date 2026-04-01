import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

const { width: W } = Dimensions.get('window');

const ACCENT = '#1C2E4A';
const ORANGE = '#FFA726';

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
    { key: 'intro',     title: 'Votre compte',    icon: 'storefront' },
    { key: 'business',  title: 'Votre activité',  icon: 'briefcase' },
    { key: 'docs',      title: 'Documents',        icon: 'document-text' },
    { key: 'bank',      title: 'Coordonnées',      icon: 'card' },
    { key: 'review',    title: 'Récapitulatif',    icon: 'checkmark-circle' },
];

const BUSINESS_TYPES_PARTNER = [
    'Restaurant / Café', 'Boutique / Commerce', 'Supermarché / Épicerie',
    'Hôtel / Hébergement', 'Transport / Logistique', 'Services (salon, réparation…)',
    'Pharmacie / Santé', 'Autre',
];

const BUSINESS_TYPES_SELLER = [
    'Particulier', 'Concessionnaire auto', 'Garage / Mécanique',
    'Importateur', 'Autre',
];

// ─── DocPicker button ─────────────────────────────────────────────────────────

function DocPicker({ label, value, onPick, uploading }) {
    return (
        <TouchableOpacity style={styles.docBtn} onPress={onPick} activeOpacity={0.8}>
            {uploading ? (
                <ActivityIndicator size="small" color={ORANGE} />
            ) : value ? (
                <Image source={{ uri: value.uri }} style={styles.docThumb} resizeMode="cover" />
            ) : (
                <View style={styles.docPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={22} color="#aaa" />
                </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.docLabel}>{label}</Text>
                {value
                    ? <Text style={[styles.docStatus, { color: '#2E7D32' }]}>✓ Document uploadé</Text>
                    : <Text style={styles.docStatus}>Appuyez pour sélectionner</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>
    );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MerchantKycScreen({ navigation, route }) {
    const { user } = useAuth();
    const merchantType = route.params?.merchantType || 'partner'; // 'partner' or 'car_seller'
    const isPartner    = merchantType === 'partner';

    const [step, setStep]     = useState(0);
    const [saving, setSaving] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    const [form, setForm] = useState({
        business_name: '',
        business_type: '',
        rccm_number:   '',
        tax_id:        '',
        address:       '',
        city:          '',
        phone:         user?.phone || '',
        email:         user?.email || '',
        website:       '',
    });

    const [docs, setDocs] = useState({
        rccm_doc:        null,
        id_card:         null,
        tax_cert:        null,
        storefront_photo: null,
    });

    const [bankInfo, setBankInfo] = useState({
        bank_name:      '',
        account_number: '',
        account_holder: user?.name || '',
    });

    const [uploading, setUploading] = useState({});

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setBank  = (k, v) => setBankInfo(b => ({ ...b, [k]: v }));

    // ── Slide transition ──────────────────────────────────────────────────────

    const goTo = (next) => {
        Animated.timing(slideAnim, { toValue: -W, duration: 180, useNativeDriver: true }).start(() => {
            setStep(next);
            slideAnim.setValue(W);
            Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        });
    };

    // ── Image upload ──────────────────────────────────────────────────────────

    const pickImage = async (docKey) => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour uploader vos documents.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.75,
            allowsEditing: true,
        });
        if (result.canceled) return;
        const asset = result.assets[0];

        setUploading(u => ({ ...u, [docKey]: true }));
        try {
            const formData = new FormData();
            formData.append('file', {
                uri:  asset.uri,
                name: `${docKey}.jpg`,
                type: 'image/jpeg',
            });
            const res = await api.post('/verifications/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setDocs(d => ({ ...d, [docKey]: { uri: asset.uri, url: res.data.url } }));
        } catch (e) {
            Alert.alert('Erreur upload', e.response?.data?.error || 'Impossible d\'uploader ce document.');
        } finally {
            setUploading(u => ({ ...u, [docKey]: false }));
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        const requiredDocs = isPartner
            ? ['rccm_doc', 'id_card']
            : ['id_card'];

        const missing = requiredDocs.filter(k => !docs[k]);
        if (missing.length > 0) {
            Alert.alert('Documents manquants', 'Veuillez uploader tous les documents requis avant de soumettre.');
            return;
        }
        if (!form.business_name.trim()) {
            Alert.alert('Champ manquant', 'Le nom de votre activité est requis.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/verifications/merchant', {
                merchant_type: merchantType,
                ...form,
                docs: Object.fromEntries(
                    Object.entries(docs).filter(([, v]) => v).map(([k, v]) => [k, v.url])
                ),
                bank_info: bankInfo,
                submit: true,
            });
            Alert.alert(
                'Dossier soumis !',
                'Votre demande a bien été reçue. Notre équipe va l\'étudier sous 24–48h.',
                [{ text: 'OK', onPress: () => navigation.replace('KycStatus', { type: 'merchant' }) }]
            );
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de soumettre le dossier.');
        } finally {
            setSaving(false);
        }
    };

    // ── Step renderers ────────────────────────────────────────────────────────

    const renderIntro = () => (
        <View style={styles.introWrap}>
            <View style={[styles.introIcon, { backgroundColor: isPartner ? '#D4F5F2' : '#F3E5F5' }]}>
                <Ionicons name={isPartner ? 'storefront' : 'pricetag'} size={52} color={isPartner ? '#00897B' : '#7B1FA2'} />
            </View>
            <Text style={styles.introTitle}>
                {isPartner ? 'Devenir Partenaire Ombia' : 'Ouvrir votre compte vendeur'}
            </Text>
            <Text style={styles.introSub}>
                {isPartner
                    ? 'Acceptez les paiements Ombia dans votre commerce. Votre demande sera examinée par notre équipe sous 24–48h.'
                    : 'Publiez vos annonces automobiles sur le marché Ombia. Nous vérifions chaque vendeur pour garantir la sécurité des acheteurs.'}
            </Text>

            <View style={styles.stepsList}>
                {[
                    'Renseignez vos informations professionnelles',
                    'Uploadez vos documents officiels',
                    'Indiquez vos coordonnées bancaires',
                    'Notre équipe valide votre dossier',
                ].map((s, i) => (
                    <View key={i} style={styles.stepsRow}>
                        <View style={[styles.stepNum, { backgroundColor: isPartner ? '#00897B' : '#7B1FA2' }]}>
                            <Text style={styles.stepNumText}>{i + 1}</Text>
                        </View>
                        <Text style={styles.stepsText}>{s}</Text>
                    </View>
                ))}
            </View>
        </View>
    );

    const renderBusiness = () => {
        const types = isPartner ? BUSINESS_TYPES_PARTNER : BUSINESS_TYPES_SELLER;
        return (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionLabel}>Informations de votre activité</Text>

                <Text style={styles.fieldLabel}>{isPartner ? 'Nom du commerce *' : 'Nom (vendeur ou enseigne) *'}</Text>
                <TextInput
                    style={styles.input}
                    value={form.business_name}
                    onChangeText={v => setField('business_name', v)}
                    placeholder={isPartner ? 'Ex : Restaurant Chez Paul' : 'Ex : Garage Auto Douala'}
                    placeholderTextColor="#bbb"
                />

                <Text style={styles.fieldLabel}>Type d'activité *</Text>
                <View style={styles.chipRow}>
                    {types.map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.chip, form.business_type === t && styles.chipActive]}
                            onPress={() => setField('business_type', t)}
                        >
                            <Text style={[styles.chipText, form.business_type === t && styles.chipTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.fieldLabel}>N° RCCM / Registre de commerce</Text>
                <TextInput
                    style={styles.input}
                    value={form.rccm_number}
                    onChangeText={v => setField('rccm_number', v)}
                    placeholder="Ex : RC/DLA/2020/B/0012"
                    placeholderTextColor="#bbb"
                />

                <Text style={styles.fieldLabel}>N° Contribuable (NIF / TIN)</Text>
                <TextInput
                    style={styles.input}
                    value={form.tax_id}
                    onChangeText={v => setField('tax_id', v)}
                    placeholder="Optionnel"
                    placeholderTextColor="#bbb"
                />

                <Text style={styles.fieldLabel}>Adresse *</Text>
                <TextInput
                    style={styles.input}
                    value={form.address}
                    onChangeText={v => setField('address', v)}
                    placeholder="Ex : Rue Kléber, Quartier Akwa"
                    placeholderTextColor="#bbb"
                />

                <Text style={styles.fieldLabel}>Ville *</Text>
                <TextInput
                    style={styles.input}
                    value={form.city}
                    onChangeText={v => setField('city', v)}
                    placeholder="Ex : Douala"
                    placeholderTextColor="#bbb"
                />

                <Text style={styles.fieldLabel}>Téléphone professionnel</Text>
                <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={v => setField('phone', v)}
                    placeholder="+237 6XX XXX XXX"
                    placeholderTextColor="#bbb"
                    keyboardType="phone-pad"
                />

                {isPartner && (
                    <>
                        <Text style={styles.fieldLabel}>Site web / Réseaux sociaux</Text>
                        <TextInput
                            style={styles.input}
                            value={form.website}
                            onChangeText={v => setField('website', v)}
                            placeholder="https:// ou @insta (optionnel)"
                            placeholderTextColor="#bbb"
                            autoCapitalize="none"
                        />
                    </>
                )}
            </ScrollView>
        );
    };

    const renderDocs = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Documents officiels</Text>
            <Text style={styles.sectionHint}>
                Prenez des photos claires de vos documents. Format accepté : JPG / PNG (max 8 Mo).
            </Text>

            <DocPicker
                label="RCCM / Registre de commerce *"
                value={docs.rccm_doc}
                onPick={() => pickImage('rccm_doc')}
                uploading={uploading.rccm_doc}
            />
            <DocPicker
                label="Pièce d'identité (CNI / Passeport) *"
                value={docs.id_card}
                onPick={() => pickImage('id_card')}
                uploading={uploading.id_card}
            />
            <DocPicker
                label={isPartner ? 'Attestation fiscale (optionnel)' : 'Justificatif de domicile (optionnel)'}
                value={docs.tax_cert}
                onPick={() => pickImage('tax_cert')}
                uploading={uploading.tax_cert}
            />
            <DocPicker
                label={isPartner ? 'Photo de la façade / devanture' : 'Photo d\'une annonce récente (optionnel)'}
                value={docs.storefront_photo}
                onPick={() => pickImage('storefront_photo')}
                uploading={uploading.storefront_photo}
            />
        </ScrollView>
    );

    const renderBank = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Coordonnées bancaires / Mobile money</Text>
            <Text style={styles.sectionHint}>
                Ces informations servent uniquement à virer vos revenus. Elles sont cryptées et sécurisées.
            </Text>

            <Text style={styles.fieldLabel}>Banque ou opérateur</Text>
            <View style={styles.chipRow}>
                {['MTN Mobile Money', 'Orange Money', 'Airtel Money', 'UBA', 'Afriland', 'Ecobank', 'Autre'].map(b => (
                    <TouchableOpacity
                        key={b}
                        style={[styles.chip, bankInfo.bank_name === b && styles.chipActive]}
                        onPress={() => setBank('bank_name', b)}
                    >
                        <Text style={[styles.chipText, bankInfo.bank_name === b && styles.chipTextActive]}>{b}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.fieldLabel}>Numéro de compte / Mobile money</Text>
            <TextInput
                style={styles.input}
                value={bankInfo.account_number}
                onChangeText={v => setBank('account_number', v)}
                placeholder="Ex : 6XX XXX XXX ou N° de compte"
                placeholderTextColor="#bbb"
                keyboardType="default"
            />

            <Text style={styles.fieldLabel}>Titulaire du compte</Text>
            <TextInput
                style={styles.input}
                value={bankInfo.account_holder}
                onChangeText={v => setBank('account_holder', v)}
                placeholder="Nom complet du titulaire"
                placeholderTextColor="#bbb"
            />

            <View style={styles.infoBox}>
                <Ionicons name="lock-closed-outline" size={16} color="#0288D1" />
                <Text style={styles.infoText}>Vos données bancaires sont chiffrées et uniquement accessibles par notre équipe de paiements.</Text>
            </View>
        </ScrollView>
    );

    const renderReview = () => {
        const docCount = Object.values(docs).filter(Boolean).length;
        return (
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>Récapitulatif de votre dossier</Text>

                {/* Business info */}
                <View style={styles.reviewCard}>
                    <Text style={styles.reviewCardTitle}>Activité</Text>
                    {[
                        ['Nom', form.business_name || '—'],
                        ['Type', form.business_type || '—'],
                        ['RCCM', form.rccm_number || '—'],
                        ['Ville', form.city || '—'],
                        ['Téléphone', form.phone || '—'],
                    ].map(([l, v]) => (
                        <View key={l} style={styles.reviewRow}>
                            <Text style={styles.reviewLbl}>{l}</Text>
                            <Text style={styles.reviewVal}>{v}</Text>
                        </View>
                    ))}
                </View>

                {/* Docs */}
                <View style={styles.reviewCard}>
                    <Text style={styles.reviewCardTitle}>Documents</Text>
                    {Object.entries(docs).map(([k, v]) => (
                        <View key={k} style={styles.reviewRow}>
                            <Text style={styles.reviewLbl}>{k.replace(/_/g, ' ')}</Text>
                            <Text style={[styles.reviewVal, { color: v ? '#2E7D32' : '#aaa' }]}>
                                {v ? '✓ Uploadé' : 'Non fourni'}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Bank */}
                <View style={styles.reviewCard}>
                    <Text style={styles.reviewCardTitle}>Compte bancaire</Text>
                    {[
                        ['Banque', bankInfo.bank_name || '—'],
                        ['Titulaire', bankInfo.account_holder || '—'],
                        ['Numéro', bankInfo.account_number ? '•••• ' + bankInfo.account_number.slice(-4) : '—'],
                    ].map(([l, v]) => (
                        <View key={l} style={styles.reviewRow}>
                            <Text style={styles.reviewLbl}>{l}</Text>
                            <Text style={styles.reviewVal}>{v}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#0288D1" />
                    <Text style={styles.infoText}>
                        En soumettant, vous certifiez que les informations fournies sont exactes. Toute fausse déclaration entraîne le rejet de la demande.
                    </Text>
                </View>
            </ScrollView>
        );
    };

    const STEP_RENDERERS = [renderIntro, renderBusiness, renderDocs, renderBank, renderReview];

    // ── Step validation ───────────────────────────────────────────────────────

    const canProceed = () => {
        if (step === 1) return form.business_name.trim() && form.address.trim() && form.city.trim();
        return true;
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) goTo(step + 1);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const accent = isPartner ? '#00897B' : '#7B1FA2';

    return (
        <SafeAreaView style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 0 ? goTo(step - 1) : navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={ACCENT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{STEPS[step].title}</Text>
                <Text style={styles.headerStep}>{step + 1}/{STEPS.length}</Text>
            </View>

            {/* Progress dots */}
            <View style={styles.progressRow}>
                {STEPS.map((_, i) => (
                    <View
                        key={i}
                        style={[styles.dot, i <= step && { backgroundColor: accent, width: i === step ? 18 : 8 }]}
                    />
                ))}
            </View>

            {/* Step content */}
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
                    {STEP_RENDERERS[step]?.()}
                </Animated.View>
            </KeyboardAvoidingView>

            {/* Footer nav */}
            <View style={styles.footer}>
                {step === STEPS.length - 1 ? (
                    <TouchableOpacity
                        style={[styles.nextBtn, { backgroundColor: accent }, saving && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={saving}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.nextBtnText}>Soumettre ma demande</Text>
                            </>
                        }
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.nextBtn, { backgroundColor: accent }, !canProceed() && styles.nextBtnDisabled]}
                        onPress={handleNext}
                        disabled={!canProceed()}
                    >
                        <Text style={styles.nextBtnText}>
                            {step === 0 ? 'Commencer' : 'Continuer'}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                )}
            </View>

        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn:     { marginRight: 12 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: ACCENT },
    headerStep:  { fontSize: 12, color: '#aaa', fontWeight: '600' },

    /* Progress */
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    dot: {
        height: 8,
        width: 8,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
    },

    /* Step content */
    stepContent: { flex: 1, paddingHorizontal: 16 },

    /* Intro */
    introWrap:  { alignItems: 'center', paddingTop: 12 },
    introIcon:  {
        width: 100, height: 100, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 18,
    },
    introTitle: { fontSize: 22, fontWeight: '800', color: ACCENT, textAlign: 'center', marginBottom: 10 },
    introSub:   { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21, marginBottom: 24, paddingHorizontal: 8 },
    stepsList:  { width: '100%' },
    stepsRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    stepNum:    {
        width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    stepNumText:  { color: '#fff', fontSize: 13, fontWeight: '800' },
    stepsText:    { flex: 1, fontSize: 14, color: '#444', fontWeight: '500' },

    /* Form */
    sectionLabel: { fontSize: 16, fontWeight: '700', color: ACCENT, marginBottom: 4 },
    sectionHint:  { fontSize: 12, color: '#aaa', marginBottom: 16, lineHeight: 17 },
    fieldLabel:   { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
    input: {
        borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: '#333', backgroundColor: '#FAFAFA',
    },
    chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    chip:      {
        borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FAFAFA',
    },
    chipActive:     { borderColor: ORANGE, backgroundColor: '#FFF3E0' },
    chipText:       { fontSize: 12, color: '#666', fontWeight: '600' },
    chipTextActive: { color: ORANGE },

    /* Doc picker */
    docBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1.5,
        borderColor: '#E0E0E0', padding: 12, marginBottom: 10,
    },
    docThumb: { width: 48, height: 48, borderRadius: 8 },
    docPlaceholder: {
        width: 48, height: 48, borderRadius: 8, backgroundColor: '#F0F0F0',
        alignItems: 'center', justifyContent: 'center',
    },
    docLabel:  { fontSize: 13, fontWeight: '600', color: ACCENT, marginBottom: 3 },
    docStatus: { fontSize: 11, color: '#aaa' },

    /* Bank / Info */
    infoBox: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#EEF8FF', borderRadius: 12, padding: 14,
        marginTop: 16, gap: 8,
    },
    infoText: { flex: 1, fontSize: 12, color: '#0288D1', lineHeight: 17 },

    /* Review */
    reviewCard: {
        backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14,
        marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0',
    },
    reviewCardTitle: { fontSize: 12, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    reviewRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    reviewLbl:       { fontSize: 13, color: '#888', flex: 1 },
    reviewVal:       { fontSize: 13, fontWeight: '600', color: ACCENT, flex: 1, textAlign: 'right' },

    /* Footer */
    footer: {
        paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 14,
        shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
    },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
