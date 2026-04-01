import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';  // A02: token in encrypted storage

const API_URL  = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.68:5000/api';
export const API_BASE = API_URL.replace('/api', '');

const api = axios.create({
    baseURL:  API_URL,
    timeout:  15000,
    headers:  { 'Content-Type': 'application/json' },
});

// A02: read token — SecureStore first, AsyncStorage fallback (handles Expo Go reloads)
const getStoredToken = async () => {
    try {
        const t = await SecureStore.getItemAsync('ombia_auth_token');
        if (t) return t;
    } catch (_) {}
    return AsyncStorage.getItem('ombia_auth_token');
};

api.interceptors.request.use(
    async (config) => {
        const token = await getStoredToken();
        if (token) config.headers.Authorization = 'Bearer ' + token;
        return config;
    },
    (error) => Promise.reject(error)
);

// A07: on 401, clear stored credentials
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync('ombia_auth_token').catch(() => {});
            await AsyncStorage.removeItem('userData').catch(() => {});
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.put('/auth/password', data)
};

export const vehicleAPI = {
    create: (data) => api.post('/vehicles', data),
    getAll: () => api.get('/vehicles'),
    getById: (id) => api.get('/vehicles/' + id),
    update: (id, data) => api.put('/vehicles/' + id, data),
    delete: (id) => api.delete('/vehicles/' + id)
};

export const rideAPI = {
    getPricing: () => api.get('/rides/pricing'),
    request: (data) => api.post('/rides/request', data),
    accept: (id) => api.post('/rides/' + id + '/accept'),
    start: (id) => api.post('/rides/' + id + '/start'),
    complete: (id, data) => api.post('/rides/' + id + '/complete', data || {}),
    cancel: (id, reason) => api.post('/rides/' + id + '/cancel', { reason }),
    rate: (id, rating, comment) => api.post('/rides/' + id + '/rate', { rating, comment }),
    getHistory: (params) => api.get('/rides/history', { params }),
    getActive: () => api.get('/rides/active')
};

export const rentalAPI = {
    // Listings
    createCar: (data) => api.post('/rentals/cars', data),
    getMyCars: () => api.get('/rentals/cars/mine'),
    getAvailableCars: (params) => api.get('/rentals/cars/available', { params }),
    getCarById: (id) => api.get('/rentals/cars/' + id),
    updateCar: (id, data) => api.put('/rentals/cars/' + id, data),
    deleteCar: (id) => api.delete('/rentals/cars/' + id),
    toggleCarAvailability: (id) => api.put('/rentals/cars/' + id + '/toggle'),
    // Bookings
    createBooking: (data) => api.post('/rentals/bookings', data),
    getMyBookings: () => api.get('/rentals/bookings/mine'),
    getReceivedBookings: () => api.get('/rentals/bookings/received'),
    getBookingById: (id) => api.get('/rentals/bookings/' + id),
    approveBooking: (id) => api.post('/rentals/bookings/' + id + '/approve'),
    rejectBooking: (id, reason) => api.post('/rentals/bookings/' + id + '/reject', { reason }),
    cancelBooking: (id, reason) => api.post('/rentals/bookings/' + id + '/cancel', { reason }),
    startBooking: (id) => api.post('/rentals/bookings/' + id + '/start'),
    completeBooking: (id) => api.post('/rentals/bookings/' + id + '/complete'),
    rateBooking: (id, data) => api.post('/rentals/bookings/' + id + '/rate', data),
    getPricePreview: (carId, start, end) => api.get('/rentals/cars/' + carId + '/price', { params: { start, end } })
};

export const couponAPI = {
    validate: (code, fare) => api.post('/coupons/validate', { code, fare }),
};

export const walletAPI = {
    getBalance: () => api.get('/wallet/balance'),
    getTransactions: (params) => api.get('/wallet/transactions', { params }),
    topup: (data) => api.post('/wallet/topup', data),
    withdraw: (data) => api.post('/wallet/withdraw', data),
    generatePaymentQR: (data) => api.post('/wallet/generate-payment-qr', data),
    scanPay: (data) => api.post('/wallet/scan-pay', data),
};

export const productAPI = {
    browse:      (params)       => api.get('/products', { params }),
    getMine:     ()             => api.get('/products/mine'),
    getById:     (id)           => api.get('/products/' + id),
    create:      (data)         => api.post('/products', data),
    update:      (id, data)     => api.put('/products/' + id, data),
    remove:      (id)           => api.delete('/products/' + id),
    uploadPhoto: (formData)     => api.post('/products/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const orderAPI = {
    create:       (data) => api.post('/orders', data),
    getMine:      ()     => api.get('/orders/mine'),
    getReceived:  ()     => api.get('/orders/received'),
    getById:      (id)   => api.get('/orders/' + id),
    updateStatus: (id, status) => api.put('/orders/' + id + '/status', { status }),
    cancel:       (id)   => api.delete('/orders/' + id),
};

export const deliveryAPI = {
    getPricing:   ()     => api.get('/deliveries/pricing'),
    request:      (data) => api.post('/deliveries', data),
    getActive:    ()     => api.get('/deliveries/active'),
    getAvailable: ()     => api.get('/deliveries/available'),
    getHistory:   (p)    => api.get('/deliveries/history', { params: p }),
    accept:  (id) => api.post('/deliveries/' + id + '/accept'),
    pickup:  (id) => api.post('/deliveries/' + id + '/pickup'),
    deliver: (id) => api.post('/deliveries/' + id + '/deliver'),
    cancel:  (id) => api.post('/deliveries/' + id + '/cancel'),
    rate:    (id, data) => api.post('/deliveries/' + id + '/rate', data),
};

export const supportAPI = {
    getTickets:   ()           => api.get('/support/tickets'),
    getTicket:    (id)         => api.get('/support/tickets/' + id),
    createTicket: (data)       => api.post('/support/tickets', data),
    sendMessage:  (id, content) => api.post('/support/tickets/' + id + '/messages', { content }),
    getUnread:    ()           => api.get('/support/unread'),
    rate:         (id, rating) => api.post('/support/tickets/' + id + '/rate', { rating }),
    close:        (id)         => api.put('/support/tickets/' + id + '/close'),
};

export default api;
