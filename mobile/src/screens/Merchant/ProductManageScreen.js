import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { productAPI } from '../../services/api.service';
import api from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
    active:       { label: 'Actif',    color: '#43A047', bg: '#E8F5E9' },
    paused:       { label: 'Pausé',    color: '#FB8C00', bg: '#FFF3E0' },
    out_of_stock: { label: 'Rupture',  color: '#E53935', bg: '#FFEBEE' },
};

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#1565C0','#7B1FA2','#00897B','#E53935','#FB8C00','#2E7D32','#D81B60','#0288D1'];
const getInitials = name => {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '??';
};
const getAvatarColor = name => {
    let h = 0;
    for (const c of (name || '')) h = h * 31 + c.charCodeAt(0);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

// ── Shop header component ─────────────────────────────────────────────────────

function ShopHeader({ logoUrl, businessName, businessType, onLogoPress, uploading, navigation }) {
    const initials = getInitials(businessName);
    const color    = getAvatarColor(businessName);
    return (
        <View style={shopStyles.wrap}>
            <TouchableOpacity onPress={onLogoPress} activeOpacity={0.8} style={shopStyles.avatarTouch}>
                {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={shopStyles.logo} resizeMode="cover" />
                ) : (
                    <View style={[shopStyles.logo, shopStyles.logoInitials, { backgroundColor: color }]}>
                        <Text style={shopStyles.initials}>{initials}</Text>
                    </View>
                )}
                {uploading ? (
                    <View style={shopStyles.loaderOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                    </View>
                ) : (
                    <View style={shopStyles.cameraBtn}>
                        <Ionicons name="camera" size={12} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={shopStyles.name} numberOfLines={1}>{businessName || 'Ma boutique'}</Text>
                {businessType ? <Text style={shopStyles.type}>{businessType}</Text> : null}
            </View>
            <TouchableOpacity
                style={shopStyles.ordersBtn}
                onPress={() => navigation.navigate('MyOrders', { tab: 'seller' })}
            >
                <Ionicons name="receipt-outline" size={16} color="#1565C0" />
                <Text style={shopStyles.ordersBtnText}>Commandes</Text>
            </TouchableOpacity>
        </View>
    );
}

const shopStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    },
    avatarTouch: { position: 'relative' },
    logo: { width: 60, height: 60, borderRadius: 16, borderWidth: 2, borderColor: '#EAECF0' },
    logoInitials: { alignItems: 'center', justifyContent: 'center' },
    initials: { fontSize: 20, fontWeight: '900', color: '#fff' },
    loaderOverlay: {
        position: 'absolute', inset: 0, borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },
    cameraBtn: {
        position: 'absolute', bottom: -2, right: -2,
        backgroundColor: '#1565C0', borderRadius: 10,
        width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    name:  { fontSize: 15, fontWeight: '800', color: '#1C2E4A' },
    type:  { fontSize: 11, color: '#9AA3B0', marginTop: 2 },
    ordersBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#EEF4FF', borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 7,
    },
    ordersBtnText: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

const ProductManageScreen = ({ navigation }) => {
    const { user } = useAuth();

    if (!user?.active_services?.includes('store_owner')) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 16 }}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <View style={styles.blockedWrap}>
                    <View style={styles.blockedIcon}>
                        <Ionicons name="bag-handle-outline" size={52} color="#7B1FA2" />
                    </View>
                    <Text style={styles.blockedTitle}>Boutique en ligne</Text>
                    <Text style={styles.blockedDesc}>
                        Pour ouvrir votre boutique Ombia, complétez la vérification "Propriétaire de boutique".
                        Notre équipe examine les dossiers sous 24–48h.
                    </Text>
                    <TouchableOpacity style={styles.blockedBtn} onPress={() => navigation.navigate('ServiceActivation', { serviceKey: 'store_owner' })}>
                        <Ionicons name="document-text" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.blockedBtnText}>Commencer la vérification</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.blockedBtnSecondary} onPress={() => navigation.navigate('KycStatus', { type: 'merchant' })}>
                        <Text style={styles.blockedBtnSecondaryText}>Voir l'état de mon dossier</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const [products,     setProducts]     = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [merchantInfo, setMerchantInfo] = useState(null);
    const [logoUrl,      setLogoUrl]      = useState(null);
    const [uploadingLogo,setUploadingLogo]= useState(false);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            productAPI.getMine(),
            api.get('/verifications/merchant/me'),
        ]).then(([prodRes, merchantRes]) => {
            setProducts(prodRes.data.products || []);
            const mv = merchantRes.data?.verifications?.find(v => v.merchant_type === 'store_owner');
            if (mv) {
                setMerchantInfo(mv);
                setLogoUrl(mv.docs?.business_logo || null);
            }
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    useFocusEffect(load);

    const pickLogo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour changer votre logo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (result.canceled) return;
        setUploadingLogo(true);
        try {
            const uri  = result.assets[0].uri;
            const name = uri.split('/').pop();
            const type = 'image/' + (name.split('.').pop() || 'jpeg');
            const fd   = new FormData();
            fd.append('photo', { uri, name, type });
            const uploadRes = await api.post('/products/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            const url = uploadRes.data.url;
            await api.patch('/verifications/merchant/logo', { logo_url: url, merchant_type: 'store_owner' });
            setLogoUrl(url);
        } catch {
            Alert.alert('Erreur', 'Impossible de télécharger le logo.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const toggleStatus = async (p) => {
        const newStatus = p.status === 'active' ? 'paused' : 'active';
        try {
            await productAPI.update(p.id, { status: newStatus });
            setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x));
        } catch {
            Alert.alert('Erreur', 'Impossible de modifier le statut.');
        }
    };

    const deleteProduct = (p) => {
        Alert.alert('Supprimer ce produit ?', `"${p.name}" sera définitivement supprimé.`, [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Supprimer', style: 'destructive',
                onPress: async () => {
                    try {
                        await productAPI.remove(p.id);
                        setProducts(prev => prev.filter(x => x.id !== p.id));
                    } catch {
                        Alert.alert('Erreur', 'Impossible de supprimer.');
                    }
                },
            },
        ]);
    };

    const stats = {
        active: products.filter(p => p.status === 'active').length,
        paused: products.filter(p => p.status === 'paused').length,
        views:  products.reduce((a, p) => a + (p.view_count || 0), 0),
    };

    const renderItem = ({ item }) => {
        const sm    = STATUS_META[item.status] || STATUS_META.active;
        const photo = item.photos?.[0];
        return (
            <View style={styles.item}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.thumb} resizeMode="cover" />
                ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Ionicons name="image-outline" size={22} color="#ccc" />
                    </View>
                )}
                <View style={styles.itemBody}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemPrice}>{Number(item.price).toLocaleString('fr-FR')} XAF</Text>
                    <View style={styles.itemMeta}>
                        <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                            <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
                        </View>
                        <Text style={styles.views}>{item.view_count || 0} vues</Text>
                    </View>
                </View>
                <View style={styles.itemActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateProduct', { product: item })}>
                        <Ionicons name="pencil" size={15} color="#1565C0" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus(item)}>
                        <Ionicons name={item.status === 'active' ? 'pause-circle' : 'play-circle'} size={15} color="#FB8C00" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => deleteProduct(item)}>
                        <Ionicons name="trash" size={15} color="#E53935" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Top nav */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ma boutique</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateProduct')}>
                    <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Shop banner */}
            <ShopHeader
                logoUrl={logoUrl}
                businessName={merchantInfo?.business_name || user?.name}
                businessType={merchantInfo?.business_type}
                onLogoPress={uploadingLogo ? null : pickLogo}
                uploading={uploadingLogo}
                navigation={navigation}
            />

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statVal}>{stats.active}</Text>
                    <Text style={styles.statLabel}>Actifs</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statVal}>{stats.paused}</Text>
                    <Text style={styles.statLabel}>Pausés</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statVal}>{stats.views}</Text>
                    <Text style={styles.statLabel}>Vues totales</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1565C0" />
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="bag-handle-outline" size={52} color="#D0D8E0" />
                            <Text style={styles.emptyText}>Aucun produit</Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateProduct')}>
                                <Ionicons name="add" size={16} color="#fff" />
                                <Text style={styles.emptyBtnText}>Ajouter un produit</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },
    blockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    blockedIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3E5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    blockedTitle: { fontSize: 20, fontWeight: '800', color: '#1C2E4A', marginBottom: 10, textAlign: 'center' },
    blockedDesc: { fontSize: 13, color: '#9AA3B0', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    blockedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7B1FA2', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, width: '100%', marginBottom: 12 },
    blockedBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    blockedBtnSecondary: { paddingVertical: 10 },
    blockedBtnSecondaryText: { color: '#9AA3B0', fontSize: 13, fontWeight: '500' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },
    addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' },

    statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginVertical: 12 },
    statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EAECF0' },
    statVal:   { fontSize: 20, fontWeight: '900', color: '#1C2E4A' },
    statLabel: { fontSize: 10, color: '#9AA3B0', fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },

    list: { paddingHorizontal: 16, paddingBottom: 24 },
    item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAECF0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    thumb: { width: 64, height: 64, borderRadius: 10, marginRight: 12 },
    thumbPlaceholder: { backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
    itemBody: { flex: 1 },
    itemName:  { fontSize: 14, fontWeight: '700', color: '#1C2E4A', marginBottom: 3 },
    itemPrice: { fontSize: 13, fontWeight: '800', color: '#1565C0', marginBottom: 6 },
    itemMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: '700' },
    views: { fontSize: 10, color: '#B0B8C1' },
    itemActions: { gap: 8, alignItems: 'center' },
    actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 14, color: '#B0B8C1', marginTop: 12, fontWeight: '600', marginBottom: 20 },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1565C0', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default ProductManageScreen;
