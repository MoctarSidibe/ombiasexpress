import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, TextInput, Image, ActivityIndicator,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productAPI } from '../../services/api.service';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 40) / 2;

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

function SellerAvatar({ photoUrl, name, size = 20 }) {
    if (photoUrl) {
        return <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
    }
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: size * 0.45, fontWeight: '800', color: '#fff' }}>{getInitials(name)}</Text>
        </View>
    );
}

// ── Category definitions ──────────────────────────────────────────────────────

const CATEGORIES = [
    { key: 'all',         label: 'Tout',        icon: 'grid',           color: '#1C2E4A', bg: '#EEF1F6' },
    { key: 'restaurant',  label: 'Restaurant',  icon: 'restaurant',     color: '#E53935', bg: '#FFEBEE' },
    { key: 'grocery',     label: 'Épicerie',    icon: 'basket',         color: '#43A047', bg: '#E8F5E9' },
    { key: 'fashion',     label: 'Mode',        icon: 'shirt',          color: '#8E24AA', bg: '#F3E5F5' },
    { key: 'beauty',      label: 'Beauté',      icon: 'flower-outline', color: '#D81B60', bg: '#FCE4EC' },
    { key: 'electronics', label: 'Électronique',icon: 'phone-portrait', color: '#1565C0', bg: '#E3F2FD' },
    { key: 'home',        label: 'Maison',      icon: 'home',           color: '#6D4C41', bg: '#EFEBE9' },
    { key: 'sports',      label: 'Sport',       icon: 'fitness',        color: '#FB8C00', bg: '#FFF3E0' },
    { key: 'services',    label: 'Services',    icon: 'construct',      color: '#00838F', bg: '#E0F7FA' },
    { key: 'other',       label: 'Autre',       icon: 'ellipsis-horizontal', color: '#546E7A', bg: '#ECEFF1' },
];

// ── Product card ──────────────────────────────────────────────────────────────

const ProductCard = ({ item, onPress }) => {
    const photo = item.photos?.[0];
    return (
        <TouchableOpacity style={[styles.card, { width: CARD_W }]} onPress={onPress} activeOpacity={0.82}>
            {photo ? (
                <Image source={{ uri: photo }} style={styles.cardImg} resizeMode="cover" />
            ) : (
                <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                    <Ionicons name="image-outline" size={32} color="#ccc" />
                </View>
            )}
            <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.cardPrice}>{Number(item.price).toLocaleString('fr-FR')} XAF</Text>
                <View style={styles.cardMeta}>
                    <SellerAvatar photoUrl={item.seller?.profile_photo} name={item.seller?.name} size={16} />
                    <Text style={styles.cardMetaText} numberOfLines={1}>{item.seller?.name || '—'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ── Screen ────────────────────────────────────────────────────────────────────

const EcommerceScreen = ({ navigation }) => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch]       = useState('');
    const [products, setProducts]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [page, setPage]           = useState(1);
    const [hasMore, setHasMore]     = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(async (cat, q, pg) => {
        if (pg === 1) setLoading(true);
        else setLoadingMore(true);
        try {
            const params = { page: pg, limit: 20 };
            if (cat !== 'all') params.category = cat;
            if (q.trim()) params.search = q.trim();
            const res = await productAPI.browse(params);
            const newItems = res.data.products || [];
            setProducts(pg === 1 ? newItems : prev => [...prev, ...newItems]);
            setHasMore(pg < (res.data.pages || 1));
        } catch { setProducts([]); }
        if (pg === 1) setLoading(false);
        else setLoadingMore(false);
    }, []);

    useEffect(() => {
        setPage(1);
        load(activeCategory, search, 1);
    }, [activeCategory, search]);

    const loadMore = () => {
        if (!hasMore || loadingMore) return;
        const next = page + 1;
        setPage(next);
        load(activeCategory, search, next);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Marchés Ombia</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={16} color="#9AA3B0" style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un produit..."
                    placeholderTextColor="#B0B8C1"
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                />
                {search ? (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={16} color="#B0B8C1" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Categories grid */}
            <View style={styles.catGrid}>
                {CATEGORIES.map(cat => {
                    const active = activeCategory === cat.key;
                    return (
                        <TouchableOpacity
                            key={cat.key}
                            style={styles.catCell}
                            onPress={() => setActiveCategory(cat.key)}
                            activeOpacity={0.72}
                        >
                            <View style={[
                                styles.catIconWrap,
                                { backgroundColor: active ? cat.color : cat.bg },
                            ]}>
                                <Ionicons
                                    name={cat.icon}
                                    size={18}
                                    color={active ? '#fff' : cat.color}
                                />
                            </View>
                            <Text
                                style={[styles.catCellLabel, active && { color: cat.color, fontWeight: '800' }]}
                                numberOfLines={1}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Product grid */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1565C0" />
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={i => i.id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                        />
                    )}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color="#1565C0" style={{ marginVertical: 16 }} /> : null}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="bag-handle-outline" size={52} color="#D0D8E0" />
                            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1, borderColor: '#EAECF0',
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1C2E4A', padding: 0 },

    catGrid: {
        flexDirection:    'row',
        flexWrap:         'wrap',
        paddingHorizontal: 12,
        paddingVertical:   10,
        backgroundColor:  '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#EAECF0',
    },
    catCell: {
        width:      '20%',
        alignItems: 'center',
        paddingVertical: 6,
    },
    catIconWrap: {
        width:          40,
        height:         40,
        borderRadius:   20,
        alignItems:     'center',
        justifyContent: 'center',
        marginBottom:   4,
    },
    catCellLabel: {
        fontSize:  9,
        fontWeight: '600',
        color:     '#6B7280',
        textAlign: 'center',
    },

    list: { paddingHorizontal: 16, paddingBottom: 24 },
    row:  { justifyContent: 'space-between', marginBottom: 10 },

    card: {
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1, borderColor: '#EAECF0',
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardImg: { width: '100%', height: 110 },
    cardImgPlaceholder: { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    cardBody: { padding: 8 },
    cardName:  { fontSize: 12, fontWeight: '700', color: '#1C2E4A', marginBottom: 4, lineHeight: 16 },
    cardPrice: { fontSize: 13, fontWeight: '800', color: '#1565C0', marginBottom: 4 },
    cardMeta:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardMetaText: { fontSize: 10, color: '#9AA3B0', flex: 1 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty:  { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 14, color: '#B0B8C1', marginTop: 12, fontWeight: '600' },
});

export default EcommerceScreen;
