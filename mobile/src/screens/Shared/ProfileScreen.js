import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api.service';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { useLanguage } from '../../context/LanguageContext';

// ── Edit Profile Modal ──────────────────────────────────────────────────────

const EditProfileModal = ({ visible, user, onClose, onSaved }) => {
    const [name, setName]   = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
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
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.modalCancel}>Annuler</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Modifier le profil</Text>
                        <TouchableOpacity onPress={save} disabled={saving}>
                            {saving
                                ? <ActivityIndicator size="small" color={COLORS.primary} />
                                : <Text style={styles.modalSave}>Enregistrer</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <Text style={styles.fieldLabel}>Nom complet</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Votre nom"
                            autoCapitalize="words"
                        />
                        <Text style={styles.fieldLabel}>Téléphone</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+241 ..."
                            keyboardType="phone-pad"
                        />
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── Change Password Modal ────────────────────────────────────────────────────

const ChangePasswordModal = ({ visible, onClose }) => {
    const [current, setCurrent]   = useState('');
    const [next, setNext]         = useState('');
    const [confirm, setConfirm]   = useState('');
    const [saving, setSaving]     = useState(false);

    const save = async () => {
        if (!current || !next) { Alert.alert('Erreur', 'Remplissez tous les champs'); return; }
        if (next !== confirm)  { Alert.alert('Erreur', 'Les mots de passe ne correspondent pas'); return; }
        if (next.length < 6)   { Alert.alert('Erreur', 'Minimum 6 caractères'); return; }
        setSaving(true);
        try {
            await authAPI.changePassword({ current_password: current, new_password: next });
            Alert.alert('Succès', 'Mot de passe mis à jour');
            setCurrent(''); setNext(''); setConfirm('');
            onClose();
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Échec');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.modalCancel}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Mot de passe</Text>
                    <TouchableOpacity onPress={save} disabled={saving}>
                        {saving
                            ? <ActivityIndicator size="small" color={COLORS.primary} />
                            : <Text style={styles.modalSave}>Changer</Text>
                        }
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                    {[
                        ['Mot de passe actuel', current, setCurrent],
                        ['Nouveau mot de passe', next, setNext],
                        ['Confirmer le nouveau', confirm, setConfirm],
                    ].map(([label, val, setter]) => (
                        <View key={label}>
                            <Text style={styles.fieldLabel}>{label}</Text>
                            <TextInput
                                style={styles.input}
                                value={val}
                                onChangeText={setter}
                                secureTextEntry
                                placeholder="••••••"
                            />
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

// ── Main Profile Screen ──────────────────────────────────────────────────────

const ProfileScreen = ({ navigation }) => {
    const { user, logout, updateUser } = useAuth();
    const [editVisible, setEditVisible]         = useState(false);
    const [pwdVisible, setPwdVisible]           = useState(false);
    const { t } = useLanguage();

    const services = user?.active_services || [];
    const isDriver      = services.includes('driver');
    const isRentalOwner = services.includes('rental_owner');
    const isFleetOwner  = services.includes('fleet_owner');

    const handleLogout = () => {
        Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnecter', style: 'destructive', onPress: logout },
        ]);
    };

    const MenuItem = ({ icon, label, onPress, tint, badge }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.menuIconWrap, { backgroundColor: (tint || COLORS.primary) + '15' }]}>
                <Ionicons name={icon} size={20} color={tint || COLORS.primary} />
            </View>
            <Text style={styles.menuText}>{label}</Text>
            {badge ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{badge}</Text></View> : null}
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
        </TouchableOpacity>
    );

    const roleLabel = () => {
        if (services.length === 0) return user?.role || 'Utilisateur';
        const map = {
            rider: 'Passager', driver: 'Chauffeur', renter: 'Locataire',
            rental_owner: 'Propriétaire', fleet_owner: 'Flotte', partner: 'Partenaire', car_seller: 'Vendeur auto',
        };
        return services.map(s => map[s] || s).join(' · ');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.headerCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(user?.name || 'U')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    <View style={styles.rolesRow}>
                        <Text style={styles.roleText}>{roleLabel()}</Text>
                    </View>
                    {user?.rating != null && (
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={16} color="#FFD700" />
                            <Text style={styles.ratingText}>{Number(user.rating).toFixed(1)}</Text>
                        </View>
                    )}
                </View>

                {/* Account section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mon compte</Text>
                    <MenuItem
                        icon="person-outline"
                        label="Modifier le profil"
                        onPress={() => setEditVisible(true)}
                    />
                    <MenuItem
                        icon="lock-closed-outline"
                        label="Changer le mot de passe"
                        onPress={() => setPwdVisible(true)}
                    />
                    <MenuItem
                        icon="wallet-outline"
                        label="Mon portefeuille"
                        onPress={() => navigation.navigate('Wallet')}
                        tint="#10B981"
                    />
                    <MenuItem
                        icon="calendar-outline"
                        label={t('profile.menu.bookings')}
                        onPress={() => navigation.navigate('MyBookings')}
                        tint="#3B82F6"
                    />
                    <MenuItem
                        icon="receipt-outline"
                        label={t('profile.menu.orders')}
                        onPress={() => navigation.navigate('MyOrders')}
                        tint="#8E24AA"
                    />
                </View>

                {/* Role-based section */}
                {(isDriver || isRentalOwner || isFleetOwner) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Mes services</Text>
                        {isDriver && (
                            <MenuItem
                                icon="car-sport-outline"
                                label="Accueil Chauffeur"
                                onPress={() => navigation.navigate('DriverHome')}
                                tint="#007AFF"
                            />
                        )}
                        {isRentalOwner && (
                            <MenuItem
                                icon="key-outline"
                                label="Mes véhicules en location"
                                onPress={() => navigation.navigate('MyRentalCars')}
                                tint="#F59E0B"
                            />
                        )}
                        {isFleetOwner && (
                            <MenuItem
                                icon="bus-outline"
                                label="Ma flotte"
                                onPress={() => navigation.navigate('FleetOwnerHome')}
                                tint="#8B5CF6"
                            />
                        )}
                    </View>
                )}

                {/* Support section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('profile.sections.support')}</Text>
                    <MenuItem
                        icon="notifications-outline"
                        label={t('profile.menu.notifications')}
                        onPress={() => navigation.navigate('Notifications')}
                        tint="#FB8C00"
                    />
                    <MenuItem
                        icon="shield-checkmark-outline"
                        label={t('profile.menu.kyc')}
                        onPress={() => navigation.navigate('KycStatus', { type: 'driver' })}
                        tint="#6B7280"
                    />
                    <MenuItem
                        icon="settings-outline"
                        label={t('profile.menu.settings')}
                        onPress={() => navigation.navigate('Settings')}
                        tint="#546E7A"
                    />
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                        <Text style={styles.logoutText}>Déconnexion</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.version}>Ombia Express · v1.0.0</Text>
            </ScrollView>

            <EditProfileModal
                visible={editVisible}
                user={user}
                onClose={() => setEditVisible(false)}
                onSaved={(updated) => updateUser(updated)}
            />
            <ChangePasswordModal
                visible={pwdVisible}
                onClose={() => setPwdVisible(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: '#F3F4F6' },

    headerCard: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: SPACING.lg,
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
    name:       { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 2 },
    email:      { fontSize: 14, color: '#6B7280', marginBottom: 8 },
    rolesRow:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 6 },
    roleText:   { fontSize: 13, color: '#6B7280', fontStyle: 'italic' },
    ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 14, fontWeight: '600', color: '#374151' },

    section: {
        backgroundColor: '#fff',
        marginBottom: 12,
        borderRadius: BORDER_RADIUS.lg,
        marginHorizontal: SPACING.md,
        overflow: 'hidden',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        paddingBottom: 6,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#F9FAFB',
    },
    menuIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuText:   { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
    menuBadge: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginRight: 8,
    },
    menuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: SPACING.md,
    },
    logoutText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
    version: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 12,
        marginVertical: 24,
    },

    // Modal styles
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle:  { fontSize: 17, fontWeight: '700', color: '#111827' },
    modalCancel: { fontSize: 16, color: '#6B7280' },
    modalSave:   { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
    modalBody:   { padding: SPACING.md },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111827',
        backgroundColor: '#F9FAFB',
    },
});

export default ProfileScreen;
