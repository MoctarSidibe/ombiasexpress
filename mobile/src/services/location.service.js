import * as Location from 'expo-location';

class LocationService {
    constructor() {
        this.watchId = null;
        this.currentLocation = null;
    }

    // Request location permissions
    requestPermissions = async () => {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus !== 'granted') {
                throw new Error('Foreground location permission not granted');
            }

            // Background permission is optional — skip if API unavailable
            let backgroundStatus = 'denied';
            try {
                const bg = await Location.requestBackgroundPermissionsAsync();
                backgroundStatus = bg.status;
            } catch (_) {}

            return {
                foreground: foregroundStatus === 'granted',
                background: backgroundStatus === 'granted'
            };
        } catch (error) {
            console.error('Permission request error:', error);
            throw error;
        }
    };

    // Get current location once
    getCurrentLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });

            this.currentLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            };

            return this.currentLocation;
        } catch (error) {
            throw error;
        }
    };

    // Start watching location (for drivers)
    startWatching = async (callback) => {
        try {
            this.watchId = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Update every 5 seconds
                    distanceInterval: 10 // Update every 10 meters
                },
                (location) => {
                    this.currentLocation = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01
                    };

                    if (callback) {
                        callback(this.currentLocation);
                    }
                }
            );

            return this.watchId;
        } catch (error) {
            throw error;
        }
    };

    // Stop watching location
    stopWatching = () => {
        if (this.watchId) {
            this.watchId.remove();
            this.watchId = null;
        }
    };

    // Calculate distance between two points (Haversine formula)
    calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    toRad = (value) => {
        return (value * Math.PI) / 180;
    };
}

export default new LocationService();
