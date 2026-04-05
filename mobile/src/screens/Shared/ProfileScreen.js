import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Modal, TextInput, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api.service';
import { COLORS } from '../../constants/colors';

// ── Edit Profile Modal ────────────────────────────────────────────────────────
const EditProfileModal = ({ visible, user, onClose, onSaved }) => {
    const [name,   setName]   = useState(user?.name  || '');
    const [phone,  setPhone]  = useState(user?.phone || '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!name.trim()) { Alert.alert('Erreur', 'Le nom est requis'); return; }
        setSaving(true);
        try {
            const res = await authAPI.updateProfile({ name: name.trim(), phone: phone.trim() });
            onSaved(res.data.user || res.data);
            onClose();
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Échec de la mise à jour');
        } finally { setSaving(false); }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Annuler</Text></TouchableOpacity>
                        <Text style={styles.modalTitle}>Modifier le profil</Text>
                        <TouchableOpacity onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color={COLORS.primary} />
                                    : <Text style={styles.modalSave}>Enregistrer</Text>}
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                        <Text style={styles.fieldLabel}>Nom complet</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName}
                            placeholder="Votre nom" autoCapitalize="words" />
                        <Text style={styles.fieldLabel}>Téléphone</Text>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                            placeholder="+241 ..." keyboardType="phone-pad" />
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── Change Password Modal ─────────────────────────────────────────────────────
const ChangePasswordModal = ({ visible, onClose }) => {
    const [current, setCurrent] = useState('');
    const [next,    setNext]    = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving,  setSaving]  = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext,    setShowNext]    = useState(false);

    const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

    const save = async () => {
        if (!current || !next)  { Alert.alert('Erreur', 'Remplissez tous les champs'); return; }
        if (next !== confirm)   { Alert.alert('Erreur', 'Les mots de passe ne correspondent pas'); return; }
        if (next.length < 6)   { Alert.alert('Erreur', 'Minimum 6 caractères'); return; }
        setSaving(true);
        try {
            await authAPI.changePassword({ current_password: current, new_password: next });
            Alert.alert('✓ Succès', 'Mot de passe mis à jour');
            reset(); onClose();
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Mot de passe actuel incorrect');
        } finally { setSaving(false); }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => { reset(); onClose(); }}>
                            <Text style={styles.modalCancel}>Annuler</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Mot de passe</Text>
                        <TouchableOpacity onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color={COLORS.primary} />
                                    : <Text style={styles.modalSave}>Changer</Text>}
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                        <Text style={styles.fieldLabel}>Mot de passe actuel</Text>
                        <View style={styles.pwdRow}>
                            <TextInput style={[styles.input, { flex: 1 }]} value={current}
                                onChangeText={setCurrent} secureTextEntry={!showCurrent} placeholder="••••••" />
                            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(s => !s)}>
                                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.fieldLabel}>Nouveau mot de passe</Text>
                        <View style={styles.pwdRow}>
                            <TextInput style={[styles.input, { flex: 1 }]} value={next}
                                onChangeText={setNext} secureTextEntry={!showNext} placeholder="Min. 6 caractères" />
                            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNext(s => !s)}>
                                <Ionicons name={showNext ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.fieldLabel}>Confirmer le nouveau</Text>
                        <TextInput style={styles.input} value={confirm} onChangeText={setConfirm}
                            secureTextEntry placeholder="Répétez le nouveau mot de passe" />
                        {next.length > 0 && (
                            <View style={[styles.strengthBar, { backgroundColor: next.length >= 8 ? '#10B981' : next.length >= 6 ? '#F59E0B' : '#EF4444' }]} />
                        )}
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── MenuItem ──────────────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, onPress, tint = '#1C2E4A', badge, destructive, isLast }) => (
    <TouchableOpacity
        style={[styles.menuItem, !isLast && styles.menuItemBorder]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.menuIconWrap, { backgroundColor: (destructive ? '#EF4444' : tint) + '18' }]}>
            <Ionicons name={icon} size={19} color={destructive ? '#EF4444' : tint} />
        </View>
        <Text style={[styles.menuText, destructive && { color: '#EF4444' }]}>{label}</Text>
        {badge ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{badge}</Text></View> : null}
        {!destructive && <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />}
    </TouchableOpacity>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
    const { user, logout, updateUser } = useAuth();
    const insets = useSafeAreaInsets();
    const [editVisible, setEditVisible] = useState(false);
    const [pwdVisible,  setPwdVisible]  = useState(false);
    const [loggingOut,  setLoggingOut]  = useState(false);

    const services     = user?.active_services || [];
    const isDriver     = services.includes('driver');
    const isRentalOwner= services.includes('rental_owner');
    const isFleetOwner = services.includes('fleet_owner');
    const isCourier    = services.includes('courier');
    const isPartner    = services.includes('partner');
    const isCarSeller  = services.includes('car_seller');
    const isStoreOwner = services.includes('store_owner');

    // ── Logout ────────────────────────────────────────────────────────────────
    const handleLogout = () => {
        Alert.alert(
            'Déconnexion',
            'Voulez-vous vous déconnecter de votre compte Ombia Express ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Déconnecter',
                    style: 'destructive',
                    onPress: async () => {
                        setLoggingOut(true);
                        try {
                            await logout();
                        } catch (_) {
                            // logout failed — force clear anyway
                        } finally {
                            setLoggingOut(false);
                        }
                    },
                },
            ],
        );
    };

    // ── KYC navigation (dynamic per service) ─────────────────────────────────
    const openKyc = () => {
        const type = isDriver     ? 'driver'
                   : isCourier   ? 'courier'
                   : isRentalOwner ? 'car'
                   : isFleetOwner  ? 'fleet'
                   : isPartner || isCarSeller || isStoreOwner ? 'merchant'
                   : 'driver';
        navigation.navigate('KycStatus', { type });
    };

    // ── Role label ────────────────────────────────────────────────────────────
    const roleLabel = () => {
        if (!services.length) return 'Utilisateur';
        const map = {
            rider: 'Passager', driver: 'Chauffeur', renter: 'Locataire',
            rental_owner: 'Propriétaire', fleet_owner: 'Flotte Ombia',
            partner: 'Partenaire', car_seller: 'Vendeur Auto',
            store_owner: 'Boutique', courier: 'Coursier',
        };
        return services.map(s => map[s] || s).filter(Boolean).join(' · ');
    };

    const initials = (user?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

                {/* ── Header card ── */}
                <View style={styles.headerCard}>
                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <TouchableOpacity style={styles.editAvatarBtn} onPress={() => setEditVisible(true)}>
                            <Ionicons name="pencil" size={12} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.name}>{user?.name || '—'}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}

                    {/* Role chips */}
                    <View style={styles.rolesRow}>
                        <View style={styles.roleChip}>
                            <Ionicons name="person-circle-outline" size={13} color="#FFA726" />
                            <Text style={styles.roleText}>{roleLabel()}</Text>
                        </View>
                    </View>

                    {/* Rating */}
                    {user?.rating != null && (
                        <View style={styles.ratingRow}>
                            {[1,2,3,4,5].map(i => (
                                <Ionicons key={i} name={i <= Math.round(user.rating) ? 'star' : 'star-outline'}
                                    size={14} color="#FFD700" />
                            ))}
                            <Text style={styles.ratingText}>{Number(user.rating).toFixed(1)}</Text>
                        </View>
                    )}

                    {/* Quick edit button */}
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => setEditVisible(true)}>
                        <Ionicons name="create-outline" size={15} color="#1565C0" />
                        <Text style={styles.editProfileBtnText}>Modifier le profil</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Compte ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>MON COMPTE</Text>
                    <MenuItem icon="lock-closed-outline"  label="Changer le mot de passe"  onPress={() => setPwdVisible(true)}                         tint="#6366F1" />
                    <MenuItem icon="wallet-outline"       label="Mon portefeuille"           onPress={() => navigation.navigate('Wallet')}               tint="#10B981" />
                    <MenuItem icon="time-outline"         label="Historique & Activités"     onPress={() => navigation.navigate('History')}              tint="#F59E0B" />
                    <MenuItem icon="calendar-outline"     label="Mes réservations"           onPress={() => navigation.navigate('MyBookings')}           tint="#3B82F6" />
                    <MenuItem icon="bag-handle-outline"   label="Mes commandes"              onPress={() => navigation.navigate('MyOrders')}             tint="#8E24AA" isLast />
                </View>

                {/* ── Services actifs ── */}
                {(isDriver || isRentalOwner || isFleetOwner || isCourier || isPartner || isCarSeller || isStoreOwner) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>MES SERVICES</Text>
                        {isDriver      && <MenuItem icon="car-sport-outline"  label="Espace Chauffeur"          onPress={() => navigation.navigate('DriverHome')}         tint="#007AFF" />}
                        {isCourier     && <MenuItem icon="bicycle-outline"    label="Espace Coursier"           onPress={() => navigation.navigate('CourierHome')}        tint="#06B6D4" />}
                        {isRentalOwner && <MenuItem icon="key-outline"        label="Mes véhicules en location"  onPress={() => navigation.navigate('MyRentalCars')}      tint="#F59E0B" />}
                        {isFleetOwner  && <MenuItem icon="bus-outline"        label="Ma flotte"                 onPress={() => navigation.navigate('FleetOwnerHome')}     tint="#8B5CF6" />}
                        {isPartner     && <MenuItem icon="storefront-outline" label="Tableau partenaire"        onPress={() => navigation.navigate('PartnerDashboard')}   tint="#00897B" />}
                        {isCarSeller   && <MenuItem icon="pricetag-outline"   label="Mes annonces auto"         onPress={() => navigation.navigate('CarSellerDashboard')} tint="#7B1FA2" />}
                        {isStoreOwner  && <MenuItem icon="bag-handle-outline" label="Ma boutique"               onPress={() => navigation.navigate('Ecommerce')}          tint="#E65100" isLast />}
                    </View>
                )}

                {/* ── Vérification KYC ── */}
                {services.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>VÉRIFICATION</Text>
                        <MenuItem icon="shield-checkmark-outline" label="État de ma vérification KYC"
                            onPress={openKyc} tint="#16A34A" isLast />
                    </View>
                )}

                {/* ── Aide & Paramètres ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>AIDE & PARAMÈTRES</Text>
                    <MenuItem icon="headset-outline"       label="Support & Aide"         onPress={() => navigation.navigate('Support')}      tint="#1565C0" />
                    <MenuItem icon="notifications-outline" label="Notifications"           onPress={() => navigation.navigate('Notifications')} tint="#FB8C00" />
                    <MenuItem icon="settings-outline"      label="Paramètres"             onPress={() => navigation.navigate('Settings')}     tint="#546E7A" />
                    <MenuItem icon="document-text-outline" label="Conditions d'utilisation" onPress={() => navigation.navigate('Terms')}      tint="#9CA3AF" />
                    <MenuItem icon="lock-open-outline"     label="Politique de confidentialité" onPress={() => navigation.navigate('PrivacyPolicy')} tint="#9CA3AF" isLast />
                </View>

                {/* ── Déconnexion ── */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} disabled={loggingOut} activeOpacity={0.7}>
                        {loggingOut
                            ? <ActivityIndicator size="small" color="#EF4444" />
                            : <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                        }
                        <Text style={styles.logoutText}>
                            {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.version}>Ombia Express · v1.0.0</Text>
            </ScrollView>

            <EditProfileModal
                visible={editVisible}
                user={user}
                onClose={() => setEditVisible(false)}
                onSaved={updateUser}
            />
            <ChangePasswordModal
                visible={pwdVisible}
                onClose={() => setPwdVisible(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },

    // ── Header card ──────────────────────────────────────────────────────────
    headerCard: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingTop: 28,
        paddingBottom: 20,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    avatarWrap:    { position: 'relative', marginBottom: 14 },
    avatar: {
        width: 84, height: 84, borderRadius: 42,
        backgroundColor: '#1C2E4A',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#FFA726',
        shadowColor: '#FFA726', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
    },
    avatarText:    { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 1 },
    editAvatarBtn: {
        position: 'absolute', bottom: 0, right: 0,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#FFA726', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    name:    { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2, textAlign: 'center' },
    email:   { fontSize: 14, color: '#6B7280', marginBottom: 2, textAlign: 'center' },
    phone:   { fontSize: 13, color: '#9CA3AF', marginBottom: 10, textAlign: 'center' },
    rolesRow:{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
    roleChip:{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,167,38,0.1)', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 4,
    },
    roleText:{ fontSize: 12, fontWeight: '600', color: '#CC8400' },
    ratingRow:{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 14 },
    ratingText:{ fontSize: 13, fontWeight: '700', color: '#374151', marginLeft: 4 },
    editProfileBtn:{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1.5, borderColor: '#1565C0',
        borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7,
    },
    editProfileBtnText:{ fontSize: 13, fontWeight: '700', color: '#1565C0' },

    // ── Sections ─────────────────────────────────────────────────────────────
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionLabel:{
        fontSize: 11, fontWeight: '700', color: '#9CA3AF',
        letterSpacing: 0.8, textTransform: 'uppercase',
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
    },
    menuItem:{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    menuIconWrap:{
        width: 36, height: 36, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', marginRight: 13,
    },
    menuText:  { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
    menuBadge: {
        backgroundColor: '#EF4444', borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 2, marginRight: 8,
    },
    menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // ── Logout ────────────────────────────────────────────────────────────────
    logoutRow:{
        flexDirection: 'row', alignItems: 'center', gap: 13,
        padding: 16,
    },
    logoutText: { fontSize: 15, color: '#EF4444', fontWeight: '700' },

    version: { textAlign: 'center', color: '#C0C4CC', fontSize: 11, marginTop: 8 },

    // ── Modals ────────────────────────────────────────────────────────────────
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader:{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    modalTitle:  { fontSize: 17, fontWeight: '700', color: '#111827' },
    modalCancel: { fontSize: 16, color: '#6B7280' },
    modalSave:   { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
    modalBody:   { padding: 16 },
    fieldLabel:{
        fontSize: 12, fontWeight: '700', color: '#374151',
        marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4,
    },
    input:{
        borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
    },
    pwdRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn:{ padding: 10 },
    strengthBar:{ height: 3, borderRadius: 2, marginTop: 6 },
});

export default ProfileScreen;
