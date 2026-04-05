import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Switch,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../../components/LeafletMap';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';

const FEATURES = ['AC', 'GPS', 'Automatic', 'Bluetooth', 'Child Seat', 'Sunroof', 'USB Charger', 'Backup Camera'];
const FUEL_TYPES = ['gasoline', 'diesel', 'hybrid', 'electric'];

const RegisterRentalCarScreen = ({ navigation }) => {
    const [form, setForm] = useState({
        make: '', model: '', year: '', color: '', license_plate: '',
        seats: '4', fuel_type: 'gasoline', price_per_hour: '', price_per_day: '',
        deposit_amount: '0', minimum_hours: '1', pickup_address: '',
        pickup_instructions: '', available_from: '', available_until: '',
        photos: [], features: []
    });
    const [pickupLocation, setPickupLocation] = useState({ latitude: 48.8566, longitude: 2.3522 });
    const [loading, setLoading] = useState(false);

    const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const toggleFeature = (feature) => {
        setForm(f => ({
            ...f,
            features: f.features.includes(feature)
                ? f.features.filter(x => x !== feature)
                : [...f.features, feature]
        }));
    };

    const handleMapPress = ({ latitude, longitude }) => setPickupLocation({ latitude, longitude });

    const validate = () => {
        const { make, model, year, color, license_plate, price_per_hour, price_per_day, pickup_address, available_from, available_until } = form;
        if (!make || !model || !year || !color || !license_plate || !price_per_hour || !price_per_day || !pickup_address || !available_from || !available_until) {
            Alert.alert('Missing fields', 'Please fill all required fields.');
            return false;
        }
        const fromDate = new Date(available_from);
        const untilDate = new Date(available_until);
        if (isNaN(fromDate) || isNaN(untilDate)) {
            Alert.alert('Invalid dates', 'Use format YYYY-MM-DD HH:MM');
            return false;
        }
        if (untilDate <= fromDate) {
            Alert.alert('Invalid dates', 'Available until must be after available from.');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const parseDate = (s) => new Date(s.trim()).toISOString();
            await rentalAPI.createCar({
                ...form,
                year: parseInt(form.year),
                seats: parseInt(form.seats),
                price_per_hour: parseFloat(form.price_per_hour),
                price_per_day: parseFloat(form.price_per_day),
                deposit_amount: parseFloat(form.deposit_amount) || 0,
                minimum_hours: parseInt(form.minimum_hours) || 1,
                pickup_lat: pickupLocation.latitude,
                pickup_lng: pickupLocation.longitude,
                available_from: parseDate(form.available_from),
                available_until: parseDate(form.available_until),
            });
            Alert.alert('Success', 'Your car has been listed! It will appear on the map once approved by admin.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to list car');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>List Your Car</Text>
                <View style={{ width: 24 }} />
            </View>
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionTitle}>Vehicle Info</Text>
                {[['make', 'Make (e.g. Toyota) *'], ['model', 'Model (e.g. Corolla) *'], ['year', 'Year *'], ['color', 'Color *'], ['license_plate', 'License Plate *'], ['seats', 'Number of Seats']].map(([key, label]) => (
                    <View key={key} style={styles.field}>
                        <Text style={styles.label}>{label}</Text>
                        <TextInput style={styles.input} value={form[key]} onChangeText={v => setField(key, v)} placeholder={label} keyboardType={['year', 'seats'].includes(key) ? 'numeric' : 'default'} />
                    </View>
                ))}

                <Text style={styles.sectionTitle}>Fuel Type</Text>
                <View style={styles.row}>
                    {FUEL_TYPES.map(ft => (
                        <TouchableOpacity key={ft} style={[styles.chip, form.fuel_type === ft && styles.chipActive]} onPress={() => setField('fuel_type', ft)}>
                            <Text style={[styles.chipText, form.fuel_type === ft && styles.chipTextActive]}>{ft}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Pricing *</Text>
                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Per Hour ($)</Text>
                        <TextInput style={styles.input} value={form.price_per_hour} onChangeText={v => setField('price_per_hour', v)} placeholder="0.00" keyboardType="decimal-pad" />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Per Day ($)</Text>
                        <TextInput style={styles.input} value={form.price_per_day} onChangeText={v => setField('price_per_day', v)} placeholder="0.00" keyboardType="decimal-pad" />
                    </View>
                </View>
                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Deposit ($)</Text>
                        <TextInput style={styles.input} value={form.deposit_amount} onChangeText={v => setField('deposit_amount', v)} placeholder="0.00" keyboardType="decimal-pad" />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Min. Hours</Text>
                        <TextInput style={styles.input} value={form.minimum_hours} onChangeText={v => setField('minimum_hours', v)} placeholder="1" keyboardType="numeric" />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Features</Text>
                <View style={styles.row}>
                    {FEATURES.map(f => (
                        <TouchableOpacity key={f} style={[styles.chip, form.features.includes(f) && styles.chipActive]} onPress={() => toggleFeature(f)}>
                            <Text style={[styles.chipText, form.features.includes(f) && styles.chipTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Pickup Location *</Text>
                <View style={styles.field}>
                    <Text style={styles.label}>Address</Text>
                    <TextInput style={styles.input} value={form.pickup_address} onChangeText={v => setField('pickup_address', v)} placeholder="Full pickup address" />
                </View>
                <Text style={styles.mapHint}>Tap on the map to set the exact pickup pin</Text>
                <View style={styles.mapContainer}>
                    <LeafletMap
                        style={styles.map}
                        initialRegion={{ ...pickupLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                        markers={[{ id: 'pickup', coordinate: pickupLocation, type: 'car' }]}
                        onPress={handleMapPress}
                    />
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>Pickup Instructions (optional)</Text>
                    <TextInput style={[styles.input, styles.textarea]} value={form.pickup_instructions} onChangeText={v => setField('pickup_instructions', v)} placeholder="Key location, parking spot, access code..." multiline numberOfLines={3} />
                </View>

                <Text style={styles.sectionTitle}>Availability Window *</Text>
                <Text style={styles.dateHint}>Format: YYYY-MM-DD HH:MM (e.g. 2026-03-01 09:00)</Text>
                {[['available_from', 'Available From *'], ['available_until', 'Available Until *']].map(([key, label]) => (
                    <View key={key} style={styles.field}>
                        <Text style={styles.label}>{label}</Text>
                        <TextInput style={styles.input} value={form[key]} onChangeText={v => setField(key, v)} placeholder="YYYY-MM-DD HH:MM" />
                    </View>
                ))}

                <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
                    <Text style={styles.submitBtnText}>{loading ? 'Submitting...' : 'List My Car'}</Text>
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
    sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.lg, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    field: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    label: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
    textarea: { height: 80, textAlignVertical: 'top' },
    row: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
    chipActive: { borderColor: COLORS.info, backgroundColor: COLORS.info },
    chipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    chipTextActive: { color: COLORS.secondary },
    mapHint: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    mapContainer: { marginHorizontal: SPACING.lg, height: 200, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md },
    map: { flex: 1 },
    dateHint: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    submitBtn: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: COLORS.secondary, fontSize: FONT_SIZES.md, fontWeight: '700' },
});

export default RegisterRentalCarScreen;
