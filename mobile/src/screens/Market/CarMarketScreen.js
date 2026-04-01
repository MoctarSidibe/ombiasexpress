import { API_BASE } from '../../services/api.service';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    TextInput, Image, RefreshControl, ActivityIndicator,
    Modal, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api.service';

const fullUrl  = url => (!url ? null : url.startsWith('http') ? url : `${API_BASE}${url}`);
const fmt      = n => Number(n || 0).toLocaleString('fr-FR');

const FUEL_OPTIONS = [
    { key: '',           label: 'Tous' },
    { key: 'essence',    label: 'Essence' },
    { key: 'diesel',     label: 'Diesel' },
    { key: 'hybride',    label: 'Hybride' },
    { key: 'electrique', label: 'Électrique' },
];
const FUEL_LABEL  = { essence: 'Essence', diesel: 'Diesel', hybride: 'Hybride', electrique: 'Électrique' };
const TRANS_LABEL = { manuelle: 'Manuelle', automatique: 'Auto' };

export default function CarMarketScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [listings,    setListings]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);
    const [search,      setSearch]      = useState('');
    const [cityFilter,  setCityFilter]  = useState('');
    const [page,        setPage]        = useState(1);
    const [total,       setTotal]       = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filterModal, setFilterModal] = useState(false);

    // Advanced filter state (applied only when user taps "Appliquer")
    const [fuelFilter,  setFuelFilter]  = useState('');
    const [minPrice,    setMinPrice]    = useState('');
    const [maxPrice,    setMaxPrice]    = useState('');
    // Draft state inside modal
    const [draftFuel,   setDraftFuel]   = useState('');
    const [draftMin,    setDraftMin]    = useState('');
    const [draftMax,    setDraftMax]    = useState('');

    const activeFilterCount = [fuelFilter, minPrice, maxPrice].filter(Boolean).length;

    const load = useCallback(async (p = 1, reset = false) => {
        try {
            const params = { page: p, limit: 12 };
            if (search.trim())     params.make      = search.trim();
            if (cityFilter.trim()) params.city      = cityFilter.trim();
            if (fuelFilter)        params.fuel_type = fuelFilter;
            if (minPrice)          params.min_price = minPrice;
            if (maxPrice)          params.max_price = maxPrice;
            const res = await api.get('/car-listings', { params });
            const newListings = res.data.listings || [];
            setListings(prev => p === 1 ? newListings : [...prev, ...newListings]);
            setTotal(res.data.total || 0);
            setPage(p);
        } catch (_) {}
        finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }, [search, cityFilter, fuelFilter, minPrice, maxPrice]);

    useEffect(() => { load(1, true); }, []);

    const handleSearch = () => { setLoading(true); load(1, true); };

    const handleLoadMore = () => {
        if (loadingMore || listings.length >= total) return;
        setLoadingMore(true);
        load(page + 1);
    };

    const openFilter = () => {
        setDraftFuel(fuelFilter);
        setDraftMin(minPrice);
        setDraftMax(maxPrice);
        setFilterModal(true);
    };

    const applyFilter = () => {
        setFuelFilter(draftFuel);
        setMinPrice(draftMin);
        setMaxPrice(draftMax);
        setFilterModal(false);
        setLoading(true);
    };

    const clearFilter = () => {
        setDraftFuel(''); setDraftMin(''); setDraftMax('');
        setFuelFilter(''); setMinPrice(''); setMaxPrice('');
        setFilterModal(false);
        setLoading(true);
    };

    // Re-load when filters change
    useEffect(() => { if (!loading) return; load(1, true); }, [fuelFilter, minPrice, maxPrice]);

    const renderItem = ({ item }) => {
        const thumb = fullUrl(item.photos?.[0]);
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('CarMarketDetail', { listing: item })}
                activeOpacity={0.82}
            >
                {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.cardImg} />
                ) : (
                    <View style={[styles.cardImg, styles.cardImgEmpty]}>
                        <Ionicons name="car-outline" size={38} color="#ddd" />
                    </View>
                )}
                <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.make} {item.model}</Text>
                    <Text style={styles.cardYear}>{item.year}{item.color ? ` · ${item.color}` : ''}</Text>
                    <Text style={styles.cardPrice}>{fmt(item.price)} XAF</Text>
                    <View style={styles.cardTags}>
                        {item.fuel_type    && <View style={styles.tag}><Text style={styles.tagText}>{FUEL_LABEL[item.fuel_type] || item.fuel_type}</Text></View>}
                        {item.transmission && <View style={styles.tag}><Text style={styles.tagText}>{TRANS_LABEL[item.transmission] || item.transmission}</Text></View>}
                        {item.mileage      && <View style={styles.tag}><Text style={styles.tagText}>{fmt(item.mileage)} km</Text></View>}
                    </View>
                    <View style={styles.cardFooter}>
                        {item.city && <View style={styles.cityRow}><Ionicons name="location-outline" size={11} color="#aaa" /><Text style={styles.cityText}>{item.city}</Text></View>}
                        <Text style={styles.viewCount}>{item.view_count || 0} vues</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Marché Automobile</Text>
                    <Text style={styles.subtitle}>{total} véhicule{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {/* Search bar */}
            <View style={styles.searchRow}>
                <View style={[styles.searchInput, { flex: 1.2 }]}>
                    <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.searchText}
                        placeholder="Marque (Toyota…)"
                        placeholderTextColor="#C0C8D0"
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(''); handleSearch(); }}>
                            <Ionicons name="close-circle" size={16} color="#ccc" />
                        </TouchableOpacity>
                    )}
                </View>
                <View style={[styles.searchInput, { flex: 1 }]}>
                    <Ionicons name="location-outline" size={16} color="#aaa" style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.searchText}
                        placeholder="Ville"
                        placeholderTextColor="#C0C8D0"
                        value={cityFilter}
                        onChangeText={setCityFilter}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                    <Text style={styles.searchBtnText}>OK</Text>
                </TouchableOpacity>
                {/* Filter button */}
                <TouchableOpacity style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} onPress={openFilter}>
                    <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#7B1FA2'} />
                    {activeFilterCount > 0 && (
                        <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>
                    )}
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#7B1FA2" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={listings}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 10 }}
                    contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, true); }} tintColor="#7B1FA2" />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#7B1FA2" style={{ padding: 16 }} /> : null}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="car-outline" size={60} color="#E0E0E0" />
                            <Text style={styles.emptyTitle}>Aucun véhicule trouvé</Text>
                            <Text style={styles.emptySub}>Essayez d'autres critères de recherche</Text>
                        </View>
                    )}
                />
            )}

            {/* Filter Modal */}
            <Modal visible={filterModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFilterModal(false)}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setFilterModal(false)}>
                            <Ionicons name="close" size={24} color="#1C2E4A" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Filtres</Text>
                        <TouchableOpacity onPress={clearFilter}>
                            <Text style={styles.clearText}>Réinitialiser</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalScroll}>
                        {/* Fuel type */}
                        <Text style={styles.modalSectionLabel}>Carburant</Text>
                        <View style={styles.chipRow}>
                            {FUEL_OPTIONS.map(f => (
                                <TouchableOpacity
                                    key={f.key}
                                    style={[styles.chip, draftFuel === f.key && styles.chipActive]}
                                    onPress={() => setDraftFuel(f.key)}
                                >
                                    <Text style={[styles.chipText, draftFuel === f.key && styles.chipTextActive]}>{f.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Price range */}
                        <Text style={styles.modalSectionLabel}>Fourchette de prix (XAF)</Text>
                        <View style={styles.priceRow}>
                            <View style={[styles.searchInput, { flex: 1 }]}>
                                <Text style={styles.pricePrefix}>Min</Text>
                                <TextInput
                                    style={[styles.searchText, { flex: 1 }]}
                                    placeholder="0"
                                    placeholderTextColor="#C0C8D0"
                                    value={draftMin}
                                    onChangeText={setDraftMin}
                                    keyboardType="numeric"
                                />
                            </View>
                            <Text style={{ color: '#aaa', paddingHorizontal: 8 }}>—</Text>
                            <View style={[styles.searchInput, { flex: 1 }]}>
                                <Text style={styles.pricePrefix}>Max</Text>
                                <TextInput
                                    style={[styles.searchText, { flex: 1 }]}
                                    placeholder="∞"
                                    placeholderTextColor="#C0C8D0"
                                    value={draftMax}
                                    onChangeText={setDraftMax}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
                            <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 17, fontWeight: '800', color: '#1C2E4A', textAlign: 'center' },
    subtitle: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 1 },

    searchRow: { flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
    searchInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
    searchText:  { flex: 1, fontSize: 13, color: '#1C2E4A' },
    searchBtn:   { backgroundColor: '#7B1FA2', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    filterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3E5F5', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    filterBtnActive: { backgroundColor: '#7B1FA2' },
    filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#E65100', alignItems: 'center', justifyContent: 'center' },
    filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

    list: { padding: 12, gap: 10 },

    card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    cardImg: { width: '100%', height: 120 },
    cardImgEmpty: { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    cardBody: { padding: 10 },
    cardTitle: { fontSize: 13, fontWeight: '700', color: '#1C2E4A', marginBottom: 2 },
    cardYear: { fontSize: 11, color: '#aaa', marginBottom: 4 },
    cardPrice: { fontSize: 14, fontWeight: '900', color: '#7B1FA2', marginBottom: 6 },
    cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
    tag: { backgroundColor: '#F3E5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    tagText: { fontSize: 9, color: '#7B1FA2', fontWeight: '600' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cityRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    cityText: { fontSize: 10, color: '#aaa' },
    viewCount: { fontSize: 9, color: '#ccc' },

    emptyWrap: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1C2E4A', marginTop: 16 },
    emptySub: { fontSize: 13, color: '#aaa', marginTop: 6 },

    // Filter modal
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },
    clearText: { fontSize: 14, color: '#7B1FA2', fontWeight: '600' },
    modalScroll: { padding: 20, paddingBottom: 40 },
    modalSectionLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E8EAF0' },
    chipActive: { backgroundColor: '#7B1FA2', borderColor: '#7B1FA2' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
    chipTextActive: { color: '#fff' },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    pricePrefix: { fontSize: 11, fontWeight: '700', color: '#7B1FA2', marginRight: 6 },
    modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    applyBtn: { backgroundColor: '#7B1FA2', paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#7B1FA2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
