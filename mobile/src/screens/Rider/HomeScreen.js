import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LeafletMap from '../../components/LeafletMap';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import locationService from '../../services/location.service';

const RiderHomeScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapType, setMapType] = useState('standard');

    useEffect(() => {
        requestLocation();
    }, []);

    const requestLocation = async () => {
        try {
            await locationService.requestPermissions();
            const currentLocation = await locationService.getCurrentLocation();
            setLocation(currentLocation);
        } catch (error) {
            Alert.alert('Location Error', 'Could not get your location');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !location) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text>Loading map...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Map */}
            <LeafletMap
                style={styles.map}
                initialRegion={location}
                showsUserLocation
                userLocation={location}
                markers={location ? [{ id: 'user', coordinate: { latitude: location.latitude, longitude: location.longitude }, type: 'user', title: 'You are here' }] : []}
            />

            {/* Top-left: map type toggle */}
            <TouchableOpacity
                style={styles.mapTypeBtn}
                onPress={() => setMapType(t => t === 'standard' ? 'satellite' : 'standard')}
            >
                <Ionicons
                    name={mapType === 'standard' ? 'globe-outline' : 'map-outline'}
                    size={20}
                    color="#1a1a1a"
                />
            </TouchableOpacity>

            {/* Top-right: switch to Drive mode (visible when user has driver service) */}
            {(user?.active_services?.includes('driver') || user?.role === 'driver') && (
                <TouchableOpacity
                    style={styles.modeSwitchButton}
                    onPress={() => navigation.navigate('DriverHome')}
                >
                    <Ionicons name="car" size={20} color="#1a1a1a" />
                    <Text style={styles.modeSwitchText}>Conduire</Text>
                </TouchableOpacity>
            )}

            {/* Bottom card: Where to? */}
            <View style={styles.bottomCard}>
                <TouchableOpacity
                    style={styles.searchBar}
                    onPress={() => navigation.navigate('RideRequest')}
                    activeOpacity={0.85}
                >
                    <View style={styles.searchIconWrap}>
                        <Ionicons name="location" size={18} color="#fff" />
                    </View>
                    <View style={styles.searchTextWrap}>
                        <Text style={styles.searchLabel}>Where to?</Text>
                        <Text style={styles.searchSub}>Enter your destination</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color="#aaa" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    map: {
        flex: 1
    },
    mapTypeBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    modeSwitchButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    modeSwitchText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    bottomCard: {
        position: 'absolute',
        bottom: 110,
        left: 16,
        right: 16,
    },
    searchBar: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    searchIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    searchTextWrap: {
        flex: 1,
    },
    searchLabel: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    searchSub: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
});

export default RiderHomeScreen;
