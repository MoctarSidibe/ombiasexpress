import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';

const EditRentalCarScreen = ({ route, navigation }) => {
    const { car } = route.params;
    const [form, setForm] = useState({
        color: car.color || '',
        price_per_hour: String(car.price_per_hour || ''),
        price_per_day: String(car.price_per_day || ''),
        deposit_amount: String(car.deposit_amount || '0'),
        minimum_hours: String(car.minimum_hours || '1'),
        pickup_address: car.pickup_address || '',
        pickup_instructions: car.pickup_instructions || '',
        available_from: car.available_from ? car.available_from.slice(0, 16).replace('T', ' ') : '',
        available_until: car.available_until ? car.available_until.slice(0, 16).replace('T', ' ') : '',
    });
    const [loading, setLoading] = useState(false);

    const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleSave = async () => {
        setLoading(true);
        try {
            const updateData = {
                ...form,
                price_per_hour: parseFloat(form.price_per_hour),
                price_per_day: parseFloat(form.price_per_day),
                deposit_amount: parseFloat(form.deposit_amount) || 0,
                minimum_hours: parseInt(form.minimum_hours) || 1,
                available_from: new Date(form.available_from.trim()).toISOString(),
                available_until: new Date(form.available_until.trim()).toISOString(),
            };
            await rentalAPI.updateCar(car.id, updateData);
            Alert.alert('Saved', 'Car listing updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to update');
        } finally { setLoading(false); }
    };

    const fields = [
        ['color', 'Color'],
        ['price_per_hour', 'Price Per Hour ($)', 'decimal-pad'],
        ['price_per_day', 'Price Per Day ($)', 'decimal-pad'],
        ['deposit_amount', 'Deposit ($)', 'decimal-pad'],
        ['minimum_hours', 'Minimum Hours', 'numeric'],
        ['pickup_address', 'Pickup Address'],
        ['pickup_instructions', 'Pickup Instructions'],
        ['available_from', 'Available From (YYYY-MM-DD HH:MM)'],
        ['available_until', 'Available Until (YYYY-MM-DD HH:MM)'],
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Listing</Text>
                <View style={{ width: 24 }} />
            </View>
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.subtitle}>{car.make} {car.model} {car.year}</Text>
                {fields.map(([key, label, keyboardType = 'default']) => (
                    <View key={key} style={styles.field}>
                        <Text style={styles.label}>{label}</Text>
                        <TextInput style={[styles.input, key === 'pickup_instructions' && styles.textarea]} value={form[key]} onChangeText={v => setField(key, v)} placeholder={label} keyboardType={keyboardType} multiline={key === 'pickup_instructions'} numberOfLines={key === 'pickup_instructions' ? 3 : 1} />
                    </View>
                ))}
                <TouchableOpacity style={[styles.saveBtn, loading && styles.disabled]} onPress={handleSave} disabled={loading}>
                    <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
                <View style={{ height: 32 }} />
            </ScrollView></KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    scroll: { flex: 1 },
    subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm },
    field: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    label: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
    textarea: { height: 80, textAlignVertical: 'top' },
    saveBtn: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    saveBtnText: { color: COLORS.secondary, fontSize: FONT_SIZES.md, fontWeight: '700' },
});

export default EditRentalCarScreen;
