import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Dimensions, Modal, TextInput, ActivityIndicator,
    Linking, Alert, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productAPI, orderAPI, walletAPI } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

const { width: W } = Dimensions.get('window');

// ── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1565C0','#7B1FA2','#00897B','#E53935','#FB8C00','#2E7D32','#D81B60','#0288D1'];
const getInitials = name => {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};
const getAvatarColor = name => {
    let h = 0;
    for (const c of (name || '')) h = h * 31 + c.charCodeAt(0);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const CATEGORY_LABELS = {
    restaurant: 'Restauration', grocery: 'Épicerie', fashion: 'Mode',
    beauty: 'Beauté', electronics: 'Électronique', home: 'Maison',
    sports: 'Sport', services: 'Services', other: 'Autre',
};

const STATUS_LABELS = { active: 'En stock', out_of_stock: 'Rupture', paused: 'Indisponible' };

// ── Photo gallery dot ─────────────────────────────────────────────────────────

const Dot = ({ active }) => (
    <View style={[styles.dot, active && styles.dotActive]} />
);

// ── Screen ────────────────────────────────────────────────────────────────────

const ProductDetailScreen = ({ route, navigation }) => {
    const { productId } = route.params;
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [product, setProduct]   = useState(null);
    const [loading, setLoading]   = useState(true);
    const [photoIdx, setPhotoIdx] = useState(0);

    // Order modal state
    const [orderModal, setOrderModal]     = useState(false);
    const [qty, setQty]                   = useState('1');
    const [notes, setNotes]               = useState('');
    const [deliveryType, setDeliveryType] = useState('pickup');
    const [address, setAddress]           = useState('');
    const [placing, setPlacing]           = useState(false);
    const [payMethod, setPayMethod]       = useState('cash');   // 'cash' | 'ombia_wallet'
    const [walletBalance, setWalletBalance] = useState(null);

    useEffect(() => {
        productAPI.getById(productId)
            .then(r => setProduct(r.data.product))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [productId]);

    const handleOrder = async () => {
        if (!user) {
            Alert.alert('Connexion requise', 'Connectez-vous pour passer une commande.');
            return;
        }
        // Fetch wallet balance so user can make an informed choice
        try {
            const res = await walletAPI.getBalance();
            setWalletBalance(res.data.balance ?? 0);
        } catch { setWalletBalance(0); }
        setOrderModal(true);
    };

    const submitOrder = async () => {
        const quantity = parseInt(qty, 10);
        if (!quantity || quantity < 1) {
            Alert.alert('Quantité invalide', 'Veuillez entrer une quantité valide.');
            return;
        }
        if (deliveryType === 'delivery' && !address.trim()) {
            Alert.alert('Adresse requise', 'Veuillez entrer votre adresse de livraison.');
            return;
        }
        setPlacing(true);
        try {
            const totalAmt = quantity * Number(product.price);
            if (payMethod === 'ombia_wallet' && (walletBalance ?? 0) < totalAmt) {
                Alert.alert('Solde insuffisant', `Votre solde (${Number(walletBalance).toLocaleString('fr-FR')} XAF) est insuffisant pour cette commande.`);
                setPlacing(false);
                return;
            }
            await orderAPI.create({
                seller_id:        product.seller_id,
                items:            [{ product_id: product.id, quantity }],
                delivery_type:    deliveryType,
                delivery_address: deliveryType === 'delivery' ? address : null,
                notes:            notes || null,
                payment_method:   payMethod,
            });
            setOrderModal(false);
            Alert.alert(
                'Commande envoyée !',
                payMethod === 'ombia_wallet'
                    ? 'Votre commande a été placée et payée via votre portefeuille Ombia.'
                    : 'Le vendeur a reçu votre commande et vous contactera prochainement.',
            );
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de passer la commande.');
        }
        setPlacing(false);
    };

    const callSeller = () => {
        if (product?.seller?.phone) {
            Linking.openURL(`tel:${product.seller.phone}`);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1565C0" />
            </View>
        );
    }

    if (!product) {
        return (
            <View style={styles.center}>
                <Text style={{ color: '#666' }}>Produit introuvable</Text>
            </View>
        );
    }

    const photos = product.photos?.length ? product.photos : [];
    const total  = (parseInt(qty, 10) || 1) * Number(product.price);

    return (
        <View style={{ flex: 1, backgroundColor: '#F2F4F8' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Photo gallery */}
                <View style={styles.gallery}>
                    {photos.length > 0 ? (
                        <>
                            <FlatList
                                data={photos}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(_, i) => String(i)}
                                onScroll={e => setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
                                renderItem={({ item }) => (
                                    <Image source={{ uri: item }} style={{ width: W, height: 280 }} resizeMode="cover" />
                                )}
                            />
                            {photos.length > 1 && (
                                <View style={styles.dots}>
                                    {photos.map((_, i) => <Dot key={i} active={i === photoIdx} />)}
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.noPhoto}>
                            <Ionicons name="image-outline" size={60} color="#ccc" />
                        </View>
                    )}
                    {/* Back button overlay */}
                    <TouchableOpacity
                        style={[styles.backOverlay, { top: insets.top + 8 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Category + status */}
                    <View style={styles.badgeRow}>
                        <View style={styles.catBadge}>
                            <Text style={styles.catBadgeText}>{CATEGORY_LABELS[product.category] || product.category}</Text>
                        </View>
                        <View style={[styles.statusBadge, product.status !== 'active' && styles.statusBadgeRed]}>
                            <Text style={styles.statusBadgeText}>{STATUS_LABELS[product.status] || product.status}</Text>
                        </View>
                    </View>

                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.price}>{Number(product.price).toLocaleString('fr-FR')} XAF
                        <Text style={styles.unit}> / {product.unit || 'unité'}</Text>
                    </Text>

                    {/* Stock */}
                    {product.stock >= 0 && (
                        <Text style={styles.stock}>{product.stock} {product.unit || 'unité(s)'} disponible(s)</Text>
                    )}

                    {/* Description */}
                    {product.description ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.desc}>{product.description}</Text>
                        </View>
                    ) : null}

                    {/* Seller card */}
                    <View style={styles.sellerCard}>
                        {product.seller?.profile_photo ? (
                            <Image source={{ uri: product.seller.profile_photo }} style={styles.sellerAvatar} resizeMode="cover" />
                        ) : (
                            <View style={[styles.sellerAvatar, { backgroundColor: getAvatarColor(product.seller?.name), alignItems: 'center', justifyContent: 'center' }]}>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{getInitials(product.seller?.name)}</Text>
                            </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.sellerName}>{product.seller?.name || '—'}</Text>
                            <View style={styles.verifiedRow}>
                                <Ionicons name="checkmark-circle" size={13} color="#43A047" />
                                <Text style={styles.verifiedText}>Vendeur vérifié Ombia</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.callBtn} onPress={callSeller}>
                            <Ionicons name="call" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Views */}
                    <Text style={styles.views}>{product.view_count} vues</Text>
                </View>
            </ScrollView>

            {/* Bottom bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                <View>
                    <Text style={styles.bottomLabel}>Prix</Text>
                    <Text style={styles.bottomPrice}>{Number(product.price).toLocaleString('fr-FR')} XAF</Text>
                </View>
                {product.status === 'active' ? (
                    <TouchableOpacity style={styles.orderBtn} onPress={handleOrder}>
                        <Ionicons name="cart" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.orderBtnText}>Commander</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.orderBtn, { backgroundColor: '#9AA3B0' }]} onPress={callSeller}>
                        <Ionicons name="call" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.orderBtnText}>Contacter</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Order Modal */}
            <Modal visible={orderModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Passer une commande</Text>
                        <Text style={styles.modalProduct}>{product.name}</Text>

                        {/* Qty */}
                        <Text style={styles.fieldLabel}>Quantité</Text>
                        <View style={styles.qtyRow}>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => setQty(q => String(Math.max(1, (parseInt(q, 10) || 1) - 1)))}
                            >
                                <Ionicons name="remove" size={18} color="#1565C0" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.qtyInput}
                                value={qty}
                                onChangeText={setQty}
                                keyboardType="numeric"
                                textAlign="center"
                            />
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => setQty(q => String((parseInt(q, 10) || 1) + 1))}
                            >
                                <Ionicons name="add" size={18} color="#1565C0" />
                            </TouchableOpacity>
                        </View>

                        {/* Delivery type */}
                        <Text style={styles.fieldLabel}>Mode de récupération</Text>
                        <View style={styles.chipRow}>
                            {[{ k: 'pickup', l: 'Retrait sur place' }, { k: 'delivery', l: 'Livraison' }].map(o => (
                                <TouchableOpacity
                                    key={o.k}
                                    style={[styles.deliveryChip, deliveryType === o.k && styles.deliveryChipActive]}
                                    onPress={() => setDeliveryType(o.k)}
                                >
                                    <Text style={[styles.deliveryChipText, deliveryType === o.k && { color: '#fff' }]}>{o.l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {deliveryType === 'delivery' && (
                            <>
                                <Text style={styles.fieldLabel}>Adresse de livraison</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Votre adresse complète..."
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                />
                            </>
                        )}

                        <Text style={styles.fieldLabel}>Notes (optionnel)</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Instructions spéciales, allergies..."
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                        />

                        {/* Payment method */}
                        <Text style={styles.fieldLabel}>Paiement</Text>
                        <View style={styles.payRow}>
                            <TouchableOpacity
                                style={[styles.payChip, payMethod === 'cash' && styles.payChipActive]}
                                onPress={() => setPayMethod('cash')}
                            >
                                <Ionicons name="cash-outline" size={16} color={payMethod === 'cash' ? '#fff' : '#546E7A'} />
                                <Text style={[styles.payChipText, payMethod === 'cash' && { color: '#fff' }]}>Espèces</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.payChip, payMethod === 'ombia_wallet' && styles.payChipActive]}
                                onPress={() => setPayMethod('ombia_wallet')}
                            >
                                <Ionicons name="wallet-outline" size={16} color={payMethod === 'ombia_wallet' ? '#fff' : '#546E7A'} />
                                <View>
                                    <Text style={[styles.payChipText, payMethod === 'ombia_wallet' && { color: '#fff' }]}>Ombia Wallet</Text>
                                    {walletBalance !== null && (
                                        <Text style={[styles.payChipSub, payMethod === 'ombia_wallet' && { color: 'rgba(255,255,255,0.75)' }]}>
                                            {Number(walletBalance).toLocaleString('fr-FR')} XAF
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Total */}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total estimé</Text>
                            <Text style={styles.totalValue}>{total.toLocaleString('fr-FR')} XAF</Text>
                        </View>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOrderModal(false)}>
                                <Text style={styles.cancelBtnText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={submitOrder} disabled={placing}>
                                {placing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>Confirmer</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    gallery: { position: 'relative' },
    noPhoto: { width: W, height: 280, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
    dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
    dot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotActive: { backgroundColor: '#fff', width: 18 },
    backOverlay: {
        position: 'absolute', left: 16,
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },

    content: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, padding: 20 },

    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    catBadge: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    catBadgeText: { fontSize: 11, color: '#1565C0', fontWeight: '700' },
    statusBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    statusBadgeRed: { backgroundColor: '#FFEBEE' },
    statusBadgeText: { fontSize: 11, color: '#43A047', fontWeight: '700' },

    name:  { fontSize: 20, fontWeight: '800', color: '#1C2E4A', marginBottom: 6 },
    price: { fontSize: 22, fontWeight: '900', color: '#1565C0', marginBottom: 4 },
    unit:  { fontSize: 13, fontWeight: '500', color: '#9AA3B0' },
    stock: { fontSize: 12, color: '#43A047', fontWeight: '600', marginBottom: 12 },

    section: { marginTop: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1C2E4A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    desc: { fontSize: 14, color: '#4A5568', lineHeight: 21 },

    sellerCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F5F9FF', borderRadius: 14, padding: 14,
        marginTop: 20, borderWidth: 1, borderColor: '#DCEEFF',
    },
    sellerAvatar: {
        width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: '#EAECF0',
    },
    sellerName: { fontSize: 14, fontWeight: '700', color: '#1C2E4A', marginBottom: 2 },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    verifiedText: { fontSize: 11, color: '#43A047', fontWeight: '600' },
    callBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center',
    },

    views: { fontSize: 11, color: '#B0B8C1', marginTop: 14, textAlign: 'right' },

    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: '#EAECF0',
        shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08, shadowRadius: 10, elevation: 10,
    },
    bottomLabel: { fontSize: 10, color: '#9AA3B0', fontWeight: '600', textTransform: 'uppercase' },
    bottomPrice: { fontSize: 18, fontWeight: '900', color: '#1C2E4A' },
    orderBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1565C0', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14,
    },
    orderBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, maxHeight: '88%',
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20 },
    modalTitle:   { fontSize: 18, fontWeight: '800', color: '#1C2E4A', marginBottom: 4 },
    modalProduct: { fontSize: 13, color: '#9AA3B0', marginBottom: 20 },
    fieldLabel:   { fontSize: 12, fontWeight: '700', color: '#4A5568', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.3 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
    },
    qtyInput: {
        flex: 1, height: 40, borderWidth: 1.5, borderColor: '#DCEEFF',
        borderRadius: 10, fontSize: 16, fontWeight: '700', color: '#1C2E4A',
    },
    chipRow: { flexDirection: 'row', gap: 10 },
    deliveryChip: {
        flex: 1, paddingVertical: 10, borderRadius: 10,
        borderWidth: 1.5, borderColor: '#EAECF0', alignItems: 'center',
    },
    deliveryChipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
    deliveryChipText: { fontSize: 12, fontWeight: '700', color: '#546E7A' },
    textArea: {
        borderWidth: 1.5, borderColor: '#EAECF0', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
        color: '#1C2E4A', minHeight: 60, textAlignVertical: 'top',
    },
    payRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    payChip: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 12, borderWidth: 1.5, borderColor: '#EAECF0',
    },
    payChipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
    payChipText:   { fontSize: 12, fontWeight: '700', color: '#546E7A' },
    payChipSub:    { fontSize: 10, color: '#9AA3B0', marginTop: 1 },

    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 16, paddingTop: 16,
        borderTopWidth: 1, borderTopColor: '#EAECF0',
    },
    totalLabel: { fontSize: 14, color: '#4A5568', fontWeight: '600' },
    totalValue: { fontSize: 20, fontWeight: '900', color: '#1565C0' },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        borderWidth: 1.5, borderColor: '#EAECF0', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#546E7A' },
    confirmBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1565C0', alignItems: 'center' },
    confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

export default ProductDetailScreen;
