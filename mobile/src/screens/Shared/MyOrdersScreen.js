import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { orderAPI } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import socketService from '../../services/socket.service';

const STATUS_META = {
    pending:   { label: 'En attente', color: '#FB8C00', bg: '#FFF3E0', icon: 'time-outline' },
    confirmed: { label: 'Confirmée',  color: '#1565C0', bg: '#E3F2FD', icon: 'checkmark-circle-outline' },
    ready:     { label: 'Prêt',       color: '#8E24AA', bg: '#F3E5F5', icon: 'bag-check-outline' },
    delivered: { label: 'Livré',      color: '#43A047', bg: '#E8F5E9', icon: 'checkmark-done-outline' },
    cancelled: { label: 'Annulée',    color: '#E53935', bg: '#FFEBEE', icon: 'close-circle-outline' },
};

const SELLER_NEXT = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['ready'],
    ready:     ['delivered'],
};
const SELLER_LABELS = { confirmed: 'Confirmer', ready: 'Prêt à récupérer', delivered: 'Marquer livré', cancelled: 'Annuler' };

const MyOrdersScreen = ({ navigation, route }) => {
    const { user } = useAuth();
    const [tab, setTab]         = useState(route?.params?.tab || 'buyer');   // 'buyer' | 'seller'
    const [orders, setOrders]   = useState([]);
    const [loading, setLoading] = useState(true);

    // Switch tab when navigated to with a tab param (e.g. from notifications)
    useEffect(() => {
        if (route?.params?.tab) setTab(route.params.tab);
    }, [route?.params?.tab]);

    const load = useCallback(() => {
        setLoading(true);
        const call = tab === 'buyer' ? orderAPI.getMine() : orderAPI.getReceived();
        call
            .then(r => setOrders(r.data.orders || []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [tab]);

    useFocusEffect(load);

    useEffect(() => {
        const handleOrderChange = () => load();
        socketService.on('order_status_changed', handleOrderChange);
        socketService.on('new_order', handleOrderChange);
        socketService.on('order_cancelled', handleOrderChange);
        return () => {
            socketService.off('order_status_changed', handleOrderChange);
            socketService.off('new_order', handleOrderChange);
            socketService.off('order_cancelled', handleOrderChange);
        };
    }, [load]);

    const updateStatus = async (orderId, status) => {
        try {
            await orderAPI.updateStatus(orderId, status);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        } catch {
            Alert.alert('Erreur', 'Impossible de mettre à jour.');
        }
    };

    const cancelOrder = async (orderId) => {
        Alert.alert('Annuler la commande ?', 'Cette action est irréversible.', [
            { text: 'Non', style: 'cancel' },
            {
                text: 'Annuler la commande',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await orderAPI.cancel(orderId);
                        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
                    } catch {
                        Alert.alert('Erreur', 'Impossible d\'annuler.');
                    }
                },
            },
        ]);
    };

    const renderOrder = ({ item }) => {
        const sm = STATUS_META[item.status] || STATUS_META.pending;
        const isSeller = tab === 'seller';
        const nextActions = isSeller ? (SELLER_NEXT[item.status] || []) : [];
        const person = isSeller ? item.buyer : item.seller;

        return (
            <View style={styles.card}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
                        <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                        <Ionicons name={sm.icon} size={12} color={sm.color} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
                    </View>
                </View>

                {/* Person */}
                <View style={styles.personRow}>
                    <Ionicons name={isSeller ? 'person-outline' : 'storefront-outline'} size={14} color="#9AA3B0" />
                    <Text style={styles.personName}>{isSeller ? 'Client' : 'Vendeur'}: {person?.name || '—'}</Text>
                </View>

                {/* Items */}
                {item.items?.map((it, idx) => (
                    <View key={idx} style={styles.itemRow}>
                        <Text style={styles.itemName} numberOfLines={1}>{it.product_name}</Text>
                        <Text style={styles.itemQty}>×{it.quantity}</Text>
                        <Text style={styles.itemPrice}>{Number(it.subtotal).toLocaleString('fr-FR')} XAF</Text>
                    </View>
                ))}

                {/* Delivery */}
                <View style={styles.deliveryRow}>
                    <Ionicons name={item.delivery_type === 'delivery' ? 'bicycle-outline' : 'walk-outline'} size={13} color="#9AA3B0" />
                    <Text style={styles.deliveryText}>
                        {item.delivery_type === 'delivery' ? `Livraison — ${item.delivery_address || ''}` : 'Retrait sur place'}
                    </Text>
                </View>

                {/* Notes */}
                {item.notes ? (
                    <Text style={styles.notes}>📝 {item.notes}</Text>
                ) : null}

                {/* Total */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{Number(item.total_amount).toLocaleString('fr-FR')} XAF</Text>
                </View>

                {/* Actions */}
                {isSeller && nextActions.length > 0 && (
                    <View style={styles.actionsRow}>
                        {nextActions.map(ns => (
                            <TouchableOpacity
                                key={ns}
                                style={[styles.actionBtn, ns === 'cancelled' && styles.actionBtnRed]}
                                onPress={() => updateStatus(item.id, ns)}
                            >
                                <Text style={[styles.actionBtnText, ns === 'cancelled' && { color: '#E53935' }]}>
                                    {SELLER_LABELS[ns]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {!isSeller && item.status === 'pending' && (
                    <TouchableOpacity style={styles.cancelOrderBtn} onPress={() => cancelOrder(item.id)}>
                        <Text style={styles.cancelOrderText}>Annuler la commande</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mes commandes</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'buyer' && styles.tabActive]}
                    onPress={() => setTab('buyer')}
                >
                    <Text style={[styles.tabText, tab === 'buyer' && styles.tabTextActive]}>Mes achats</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'seller' && styles.tabActive]}
                    onPress={() => setTab('seller')}
                >
                    <Text style={[styles.tabText, tab === 'seller' && styles.tabTextActive]}>Reçues</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1565C0" />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={i => i.id}
                    renderItem={renderOrder}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="receipt-outline" size={52} color="#D0D8E0" />
                            <Text style={styles.emptyText}>Aucune commande</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: '#F2F4F8' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },

    tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
    tab: {
        flex: 1, paddingVertical: 10, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#EAECF0', backgroundColor: '#fff', alignItems: 'center',
    },
    tabActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
    tabText:   { fontSize: 13, fontWeight: '700', color: '#9AA3B0' },
    tabTextActive: { color: '#fff' },

    list:  { paddingHorizontal: 16, paddingBottom: 24 },
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#EAECF0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    orderId:     { fontSize: 13, fontWeight: '800', color: '#1C2E4A' },
    orderDate:   { fontSize: 11, color: '#9AA3B0', marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusText:  { fontSize: 11, fontWeight: '700' },

    personRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    personName: { fontSize: 12, color: '#4A5568', fontWeight: '600' },

    itemRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
    itemName: { flex: 1, fontSize: 13, color: '#1C2E4A', fontWeight: '600' },
    itemQty:  { fontSize: 12, color: '#9AA3B0', marginHorizontal: 8 },
    itemPrice:{ fontSize: 13, color: '#1C2E4A', fontWeight: '700' },

    deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    deliveryText:{ fontSize: 11, color: '#9AA3B0' },

    notes: { fontSize: 12, color: '#4A5568', fontStyle: 'italic', marginTop: 6 },

    totalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    totalLabel:{ fontSize: 13, color: '#546E7A', fontWeight: '600' },
    totalValue:{ fontSize: 16, fontWeight: '900', color: '#1565C0' },

    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10,
        backgroundColor: '#E3F2FD', alignItems: 'center',
    },
    actionBtnRed: { backgroundColor: '#FFEBEE' },
    actionBtnText: { fontSize: 12, fontWeight: '700', color: '#1565C0' },

    cancelOrderBtn: { marginTop: 10, paddingVertical: 8, alignItems: 'center' },
    cancelOrderText:{ fontSize: 12, color: '#E53935', fontWeight: '700' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty:  { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 14, color: '#B0B8C1', marginTop: 12, fontWeight: '600' },
});

export default MyOrdersScreen;
