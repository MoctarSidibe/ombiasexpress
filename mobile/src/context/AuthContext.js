/**
 * AuthContext
 * A02: SecureStore for JWT (encrypted, hardware-backed on device) — replaces AsyncStorage
 * A07: logout calls server /auth/logout to blacklist token
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { authAPI } from '../services/api.service';
import socketService from '../services/socket.service';
import notificationsService from '../services/notifications.service';

const AuthContext = createContext();

// Token stored in SecureStore (encrypted) + AsyncStorage fallback (handles Expo Go reloads)
const TOKEN_KEY = 'ombia_auth_token';

const saveToken = async (t) => {
    await SecureStore.setItemAsync(TOKEN_KEY, t).catch(() => {});
    await AsyncStorage.setItem(TOKEN_KEY, t);
};
const getToken = async () => {
    try {
        const secure = await SecureStore.getItemAsync(TOKEN_KEY);
        if (secure) return secure;
    } catch (_) {}
    return AsyncStorage.getItem(TOKEN_KEY);   // fallback for Expo Go
};
const deleteToken = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await AsyncStorage.removeItem(TOKEN_KEY);
};

export const AuthProvider = ({ children }) => {
    const [user,    setUser]    = useState(null);
    const [token,   setToken]   = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStoredAuth(); }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await getToken();
            const storedUser  = await AsyncStorage.getItem('userData');
            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                // Connect socket in background — never block auth restore
                socketService.connect().catch(() => {});
            }
        } catch (_) {
        } finally {
            setLoading(false);
        }
    };

    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/profile');
            const freshUser = res.data.user;
            setUser(freshUser);
            await AsyncStorage.setItem('userData', JSON.stringify(freshUser));
        } catch (_) {}
    };

    const login = async (phone, password) => {
        try {
            const response = await authAPI.login({ phone, password });

            // MFA required — return flag so screen can handle the OTP step
            if (response.data.mfa_required) {
                return { success: false, mfa_required: true, mfa_session: response.data.mfa_session };
            }

            const { token: newToken, user: newUser } = response.data;

            await saveToken(newToken);                                  // A02: SecureStore
            await AsyncStorage.setItem('userData', JSON.stringify(newUser));

            setToken(newToken);
            setUser(newUser);

            await socketService.connect();
            notificationsService.registerForPushNotifications();

            return { success: true };
        } catch (error) {
            const msg = !error.response
                ? 'Serveur inaccessible — vérifiez votre connexion réseau'
                : error.response.data?.error || 'Échec de la connexion';
            return { success: false, error: msg };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            const { token: newToken, user: newUser } = response.data;

            await saveToken(newToken);                                  // A02: SecureStore
            await AsyncStorage.setItem('userData', JSON.stringify(newUser));

            setToken(newToken);
            setUser(newUser);

            await socketService.connect();
            notificationsService.registerForPushNotifications();

            return { success: true };
        } catch (error) {
            const msg = !error.response
                ? `Serveur inaccessible — vérifiez que le serveur est démarré et que votre téléphone est sur le même réseau WiFi (${process.env.EXPO_PUBLIC_API_URL || ''})`
                : error.response.data?.error || error.response.data?.errors?.[0]?.msg || 'Échec de l\'inscription';
            return { success: false, error: msg };
        }
    };

    const logout = async () => {
        try {
            // A07: tell server to blacklist the token (invalidate server-side)
            await api.post('/auth/logout').catch(() => {});
        } finally {
            await deleteToken();                                        // A02: remove from SecureStore
            await AsyncStorage.removeItem('userData');

            socketService.disconnect();
            notificationsService.stopListeners();
            notificationsService.clearBadge();

            setToken(null);
            setUser(null);
        }
    };

    const updateUser = (updatedData) => {
        const updatedUser = { ...user, ...updatedData };
        setUser(updatedUser);
        AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    };

    // Sync active_services when admin approves KYC
    useEffect(() => {
        const handleKycChange = () => refreshUser();
        socketService.on('kyc_status_changed', handleKycChange);
        return () => socketService.off('kyc_status_changed', handleKycChange);
    }, []);

    const activateService = async (role) => {
        try {
            const response = await api.put('/auth/activate-service', { role });
            const { role: newRole, active_services } = response.data.user;
            const updatedUser = { ...user, role: newRole, active_services };
            setUser(updatedUser);
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Échec de l\'activation' };
        }
    };

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            login, register, logout,
            updateUser, refreshUser, activateService,
            isAuthenticated: !!token,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
