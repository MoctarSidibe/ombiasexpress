import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://37.60.240.199:5001';

class SocketService {
    constructor() {
        this.socket       = null;
        this.listeners    = new Map();
        this._errorLogged = false;   // suppress repeated error spam
        this._errorCount  = 0;
    }

    connect = async () => {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            transports:              ['websocket', 'polling'],
            reconnection:            true,
            reconnectionAttempts:    5,
            reconnectionDelay:       3000,
            reconnectionDelayMax:    15000,
            timeout:                 8000,
            autoConnect:             true,
        });

        this.socket.on('connect', async () => {
            this._errorLogged = false;
            this._errorCount  = 0;
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                this.socket.emit('authenticate', {
                    userId:          user.id,
                    role:            user.role,
                    active_services: user.active_services,
                });
            }
        });

        this.socket.on('disconnect', (reason) => {
            // Only log unexpected disconnects
            if (reason !== 'io client disconnect') {
                console.warn('[Socket] Disconnected:', reason);
            }
        });

        this.socket.on('connect_error', (err) => {
            this._errorCount++;
            if (this._errorCount === 1) {
                // Log once clearly
                console.warn(`[Socket] Cannot reach server at ${SOCKET_URL} — check EXPO_PUBLIC_SOCKET_URL in .env`);
            }
            // Suppress all further repeated logs silently
        });

        this.socket.io.on('reconnect_failed', () => {
            console.warn('[Socket] Gave up reconnecting after 5 attempts. Real-time features disabled.');
        });
    };

    disconnect = () => {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
            this._errorLogged = false;
            this._errorCount  = 0;
        }
    };

    get isConnected() {
        return this.socket?.connected === true;
    }

    on = (event, callback) => {
        if (!this.socket) return;
        this.socket.on(event, callback);
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
    };

    off = (event, callback) => {
        if (!this.socket || !this.listeners.has(event)) return;
        if (callback) {
            this.socket.off(event, callback);
            const remaining = this.listeners.get(event).filter(cb => cb !== callback);
            if (remaining.length) this.listeners.set(event, remaining);
            else this.listeners.delete(event);
        } else {
            this.listeners.get(event).forEach(cb => this.socket.off(event, cb));
            this.listeners.delete(event);
        }
    };

    emit = (event, data) => {
        if (this.socket?.connected) this.socket.emit(event, data);
    };

    // ── Convenience helpers ───────────────────────────────────────────────────
    updateLocation      = (lat, lng, rideId = null)      => this.emit('update_location',          { latitude: lat, longitude: lng, ride_id: rideId });
    toggleAvailability  = (is_online)                     => this.emit('toggle_availability',      { is_online });
    sendMessage         = (recipient_id, message, ride_id)=> this.emit('send_message',             { recipient_id, message, ride_id });
    driverArrived       = (ride_id, rider_id)             => this.emit('driver_arrived',           { ride_id, rider_id });
    typing              = (recipient_id, is_typing)       => this.emit('typing',                   { recipient_id, is_typing });
    updateRentalCarLocation = (carId, lat, lng)           => this.emit('rental_car_location_update',{ carId, lat, lng });
}

export default new SocketService();
