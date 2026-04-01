import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api.service';

// ── Expo Go guard ─────────────────────────────────────────────────────────────
// expo-notifications was removed from Expo Go in SDK 53.
// Skip all notification functionality silently when running in Expo Go.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

let Notifications = null;
if (!IS_EXPO_GO) {
    // Only import when running in a real dev build / standalone app
    Notifications = require('expo-notifications');

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge:  true,
        }),
    });

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('ombia', {
            name:             'Ombia Express',
            importance:       Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor:       '#FFA726',
            sound:            'default',
        });
    }
}

// ── Main service ──────────────────────────────────────────────────────────────
class NotificationsService {
    _responseListener = null;
    _receivedListener = null;
    _navigationRef    = null;

    registerForPushNotifications = async () => {
        if (IS_EXPO_GO) {
            console.info('[Notifications] Skipped — Expo Go does not support push notifications. Use a development build.');
            return null;
        }
        if (!Device.isDevice) {
            console.info('[Notifications] Skipped — simulator detected.');
            return null;
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('[Notifications] Permission denied');
            return null;
        }

        try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId || 'ombia-express',
            });
            const token = tokenData.data;
            await this._sendTokenToServer(token);
            return token;
        } catch (e) {
            console.warn('[Notifications] Token error:', e.message);
            return null;
        }
    };

    _sendTokenToServer = async (token) => {
        try {
            await api.put('/auth/push-token', { push_token: token });
        } catch (e) {
            console.warn('[Notifications] Could not send token to server:', e.message);
        }
    };

    setNavigationRef = (ref) => {
        this._navigationRef = ref;
    };

    startListeners = () => {
        if (IS_EXPO_GO || !Notifications) return;

        this._receivedListener = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.info('[Notifications] Received:', notification.request.content.title);
            }
        );

        this._responseListener = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data;
                this._handleTap(data);
            }
        );
    };

    stopListeners = () => {
        if (IS_EXPO_GO || !Notifications) return;
        if (this._receivedListener) {
            Notifications.removeNotificationSubscription(this._receivedListener);
            this._receivedListener = null;
        }
        if (this._responseListener) {
            Notifications.removeNotificationSubscription(this._responseListener);
            this._responseListener = null;
        }
    };

    _handleTap = (data) => {
        if (!this._navigationRef?.isReady()) return;
        const nav = this._navigationRef;

        switch (data?.type) {
            case 'ride_accepted':
            case 'driver_arrived':
            case 'ride_started':
            case 'ride_completed':
            case 'ride_cancelled':
                if (data.rideId) nav.navigate('RideTracking', { rideId: data.rideId });
                break;
            case 'new_ride_request':
                nav.navigate('DriverHome');
                break;
            case 'rental_booking_request':
            case 'rental_booking_approved':
            case 'rental_booking_rejected':
            case 'rental_started':
            case 'rental_completed':
                if (data.bookingId) nav.navigate('RentalBookingStatus', { bookingId: data.bookingId });
                break;
            case 'rental_car_approved':
            case 'rental_car_suspended':
                nav.navigate('MyRentalCars');
                break;
            case 'wallet_topup':
            case 'wallet_credit':
            case 'wallet_transfer':
                nav.navigate('Wallet');
                break;
            case 'support_message':
                nav.navigate('Support');
                break;
            default:
                nav.navigate('HubTabs');
        }
    };

    scheduleLocal = async ({ title, body, data }) => {
        if (IS_EXPO_GO || !Notifications) return;
        await Notifications.scheduleNotificationAsync({
            content: { title, body, data, sound: 'default' },
            trigger: null,
        });
    };

    clearBadge = () => {
        if (IS_EXPO_GO || !Notifications) return;
        Notifications.setBadgeCountAsync(0);
    };
}

export default new NotificationsService();
