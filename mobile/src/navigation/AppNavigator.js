import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Animated, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import notificationsService from '../services/notifications.service';

// Auth
import LoginScreen from '../screens/Auth/LoginScreen';
import PrivacyPolicyScreen from '../screens/Legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/Legal/TermsScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import VehicleRegistrationScreen from '../screens/Auth/VehicleRegistrationScreen';

// Hub
import ServiceHubScreen from '../screens/Home/ServiceHubScreen';
import ServiceActivationScreen from '../screens/Home/ServiceActivationScreen';

// Rider
import RideRequestScreen from '../screens/Rider/RideRequestScreen';
import RideTrackingScreen from '../screens/Rider/RideTrackingScreen';

// Driver
import DriverHomeScreen from '../screens/Driver/DriverHomeScreen';
import RideAcceptScreen from '../screens/Driver/RideAcceptScreen';
import OngoingRideScreen from '../screens/Driver/OngoingRideScreen';

// Rental — Renter screens
import RentalMapScreen from '../screens/Rental/RentalMapScreen';
import RentalCarDetailScreen from '../screens/Rental/RentalCarDetailScreen';
import RentalBookingScreen from '../screens/Rental/RentalBookingScreen';
import RentalBookingStatusScreen from '../screens/Rental/RentalBookingStatusScreen';
import RentalRatingScreen from '../screens/Rental/RentalRatingScreen';

// Rental — Owner screens
import MyRentalCarsScreen from '../screens/Rental/MyRentalCarsScreen';
import RegisterRentalCarScreen from '../screens/Rental/RegisterRentalCarScreen';
import EditRentalCarScreen from '../screens/Rental/EditRentalCarScreen';
import ReceivedBookingsScreen from '../screens/Rental/ReceivedBookingsScreen';

// Fleet Owner
import FleetOwnerHomeScreen from '../screens/FleetOwner/FleetOwnerHomeScreen';

// Delivery / Courier
import DeliveryRequestScreen from '../screens/Delivery/DeliveryRequestScreen';
import CourierHomeScreen     from '../screens/Delivery/CourierHomeScreen';

// Shared
import ProfileScreen from '../screens/Shared/ProfileScreen';
import RideHistoryScreen from '../screens/Shared/RideHistoryScreen';
import MyBookingsScreen from '../screens/Shared/MyBookingsScreen';
import PaymentScreen from '../screens/Shared/PaymentScreen';
import RatingScreen from '../screens/Shared/RatingScreen';
import WalletScreen from '../screens/Shared/WalletScreen';
import WalletTransferScreen from '../screens/Shared/WalletTransferScreen';
import SettingsScreen from '../screens/Shared/SettingsScreen';
import NotificationsScreen from '../screens/Shared/NotificationsScreen';

// Wallet — QR payments
import DriverQRScreen from '../screens/Wallet/DriverQRScreen';
import RiderScanPayScreen from '../screens/Wallet/RiderScanPayScreen';

// KYC
import DriverKycScreen from '../screens/KYC/DriverKycScreen';
import CarKycScreen from '../screens/KYC/CarKycScreen';
import KycStatusScreen from '../screens/KYC/KycStatusScreen';
import MerchantKycScreen from '../screens/KYC/MerchantKycScreen';
import FleetKycScreen from '../screens/KYC/FleetKycScreen';
import CourierKycScreen from '../screens/KYC/CourierKycScreen';

// Merchant / Market
import PartnerDashboardScreen  from '../screens/Merchant/PartnerDashboardScreen';
import CarSellerDashboardScreen from '../screens/Merchant/CarSellerDashboardScreen';
import CreateCarListingScreen   from '../screens/Merchant/CreateCarListingScreen';
import ProductManageScreen      from '../screens/Merchant/ProductManageScreen';
import CreateProductScreen      from '../screens/Merchant/CreateProductScreen';
import CarMarketScreen          from '../screens/Market/CarMarketScreen';
import CarMarketDetailScreen    from '../screens/Market/CarMarketDetailScreen';
import EcommerceScreen          from '../screens/Market/EcommerceScreen';
import ProductDetailScreen      from '../screens/Market/ProductDetailScreen';
import MyOrdersScreen           from '../screens/Shared/MyOrdersScreen';
import SupportScreen           from '../screens/Shared/SupportScreen';

// Support
import FloatingSupport         from '../components/FloatingSupport';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Loading ───────────────────────────────────────────────────────────────────

const LoadingScreen = () => (
    <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
    </View>
);

// ── Guest Stack — dashboard visible without login, Login/Register accessible ──

const GuestStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HubTabs"             component={HubTabs} />
        <Stack.Screen name="Login"               component={LoginScreen} />
        <Stack.Screen name="Register"            component={RegisterScreen} />
        <Stack.Screen name="VehicleRegistration" component={VehicleRegistrationScreen} />
        <Stack.Screen name="Support"             component={SupportScreen} />
        <Stack.Screen name="PrivacyPolicy"       component={PrivacyPolicyScreen} />
        <Stack.Screen name="Terms"               component={TermsScreen} />
    </Stack.Navigator>
);

// ── Tab meta ───────────────────────────────────────────────────────────────────

const TAB_META = {
    Hub:     { label: 'Services',     color: '#FFA726' },
    Wallet:  { label: 'Portefeuille', color: '#00897B' },
    History: { label: 'Activités',    color: '#1565C0' },
    Profile: { label: 'Profil',       color: '#7B1FA2' },
};

// ── TabItem ────────────────────────────────────────────────────────────────────

const TabItem = ({ route, focused, onPress }) => {
    const meta      = TAB_META[route.name] || { label: route.name, color: '#FFA726' };
    const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.88)).current;
    const fadeAnim  = useRef(new Animated.Value(focused ? 1 : 0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: focused ? 1 : 0.88, useNativeDriver: true, tension: 130, friction: 9 }),
            Animated.timing(fadeAnim,  { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: true }),
        ]).start();
    }, [focused]);

    const iconName = {
        Hub:     focused ? null    : null,
        Wallet:  focused ? 'wallet'           : 'wallet-outline',
        History: focused ? 'time'             : 'time-outline',
        Profile: focused ? 'person'           : 'person-outline',
    }[route.name];

    return (
        <TouchableOpacity style={tabStyles.tabItem} onPress={onPress} activeOpacity={0.8}>
            {/* Active pill background */}
            <Animated.View style={[
                tabStyles.activePill,
                { backgroundColor: meta.color + '18', opacity: fadeAnim },
            ]} />

            <Animated.View style={[tabStyles.tabContent, { transform: [{ scale: scaleAnim }] }]}>
                {/* Icon */}
                {route.name === 'Hub' ? (
                    <Image
                        source={require('../../assets/ombia-icon.png')}
                        style={[tabStyles.hubIcon, { opacity: focused ? 1 : 0.32 }]}
                        resizeMode="contain"
                    />
                ) : (
                    <Ionicons
                        name={iconName}
                        size={26}
                        color={focused ? meta.color : '#B0BAC8'}
                    />
                )}
                {/* Label */}
                <Text style={[
                    tabStyles.tabLabel,
                    { color: focused ? meta.color : '#B0BAC8', fontWeight: focused ? '800' : '500' },
                ]}>
                    {meta.label}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

// ── CustomTabBar ───────────────────────────────────────────────────────────────

const CustomTabBar = ({ state, navigation }) => {
    const insets = useSafeAreaInsets();
    const { isAuthenticated } = useAuth();
    const HUB_TAB = 'Hub'; // always accessible

    const handleTabPress = (routeName) => {
        if (!isAuthenticated && routeName !== HUB_TAB) {
            // Guest: redirect to Login instead of opening auth-required tab
            navigation.navigate('Login');
            return;
        }
        navigation.navigate(routeName);
    };

    return (
        <View style={[tabStyles.bar, { paddingBottom: insets.bottom }]}>
            <View style={tabStyles.topShadowLine} />
            <View style={tabStyles.tabRow}>
                {state.routes.map((route, index) => (
                    <TabItem
                        key={route.key}
                        route={route}
                        focused={state.index === index}
                        onPress={() => handleTabPress(route.name)}
                    />
                ))}
            </View>
        </View>
    );
};

// ── Tab bar styles ─────────────────────────────────────────────────────────────

const tabStyles = StyleSheet.create({
    bar: {
        backgroundColor: '#fff',
        shadowColor:     '#1C2E4A',
        shadowOffset:    { width: 0, height: -3 },
        shadowOpacity:   0.07,
        shadowRadius:    12,
        elevation:       16,
    },
    topShadowLine: {
        height:          0.5,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    tabRow: {
        flexDirection:    'row',
        paddingTop:       8,
        paddingHorizontal: 8,
        paddingBottom:    4,
    },
    tabItem: {
        flex:           1,
        alignItems:     'center',
        justifyContent: 'center',
        position:       'relative',
    },
    activePill: {
        position:      'absolute',
        top:           0,
        left:          6,
        right:         6,
        bottom:        0,
        borderRadius:  14,
    },
    tabContent: {
        alignItems: 'center',
        gap:         3,
        paddingVertical: 6,
    },
    hubIcon: {
        width:  28,
        height: 28,
    },
    tabLabel: {
        fontSize:     10,
        letterSpacing: 0.1,
    },
});

// ── Hub Tabs ───────────────────────────────────────────────────────────────────

const HubTabsInner = () => (
    <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
    >
        <Tab.Screen name="Hub"     component={ServiceHubScreen} />
        <Tab.Screen name="Wallet"  component={WalletScreen}     />
        <Tab.Screen name="History" component={RideHistoryScreen}/>
        <Tab.Screen name="Profile" component={ProfileScreen}    />
    </Tab.Navigator>
);

const HubTabs = () => (
    <View style={{ flex: 1 }}>
        <HubTabsInner />
        <FloatingSupport />
    </View>
);

// ── Main Stack — all authenticated users ──────────────────────────────────────

const MainStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HubTabs" component={HubTabs} />
        <Stack.Screen name="ServiceActivation" component={ServiceActivationScreen} />

        {/* Rider */}
        <Stack.Screen name="RideRequest" component={RideRequestScreen} />
        <Stack.Screen name="RideTracking" component={RideTrackingScreen} />

        {/* Driver */}
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
        <Stack.Screen name="RideAccept" component={RideAcceptScreen} />
        <Stack.Screen name="OngoingRide" component={OngoingRideScreen} />

        {/* Renter */}
        <Stack.Screen name="RentalMap" component={RentalMapScreen} />
        <Stack.Screen name="RentalCarDetail" component={RentalCarDetailScreen} />
        <Stack.Screen name="RentalBooking" component={RentalBookingScreen} />
        <Stack.Screen name="RentalBookingStatus" component={RentalBookingStatusScreen} />
        <Stack.Screen name="RentalRating" component={RentalRatingScreen} />

        {/* Rental Owner */}
        <Stack.Screen name="MyRentalCars" component={MyRentalCarsScreen} />
        <Stack.Screen name="RegisterRentalCar" component={RegisterRentalCarScreen} />
        <Stack.Screen name="EditRentalCar" component={EditRentalCarScreen} />
        <Stack.Screen name="ReceivedBookings" component={ReceivedBookingsScreen} />

        {/* Fleet Owner */}
        <Stack.Screen name="FleetOwnerHome" component={FleetOwnerHomeScreen} />

        {/* Delivery / Courier */}
        <Stack.Screen name="DeliveryRequest" component={DeliveryRequestScreen} />
        <Stack.Screen name="CourierHome"     component={CourierHomeScreen} />

        {/* Merchant */}
        <Stack.Screen name="PartnerDashboard"   component={PartnerDashboardScreen} />
        <Stack.Screen name="CarSellerDashboard" component={CarSellerDashboardScreen} />
        <Stack.Screen name="CreateCarListing"   component={CreateCarListingScreen} />

        {/* Ecommerce */}
        <Stack.Screen name="Ecommerce"       component={EcommerceScreen} />
        <Stack.Screen name="ProductDetail"   component={ProductDetailScreen} />
        <Stack.Screen name="ProductManage"   component={ProductManageScreen} />
        <Stack.Screen name="CreateProduct"   component={CreateProductScreen} />

        {/* Car Market */}
        <Stack.Screen name="CarMarket"       component={CarMarketScreen} />
        <Stack.Screen name="CarMarketDetail" component={CarMarketDetailScreen} />

        {/* Orders */}
        <Stack.Screen name="MyOrders" component={MyOrdersScreen} />

        {/* KYC */}
        <Stack.Screen name="DriverKyc"   component={DriverKycScreen} />
        <Stack.Screen name="CarKyc"      component={CarKycScreen} />
        <Stack.Screen name="MerchantKyc" component={MerchantKycScreen} />
        <Stack.Screen name="FleetKyc"    component={FleetKycScreen} />
        <Stack.Screen name="CourierKyc"  component={CourierKycScreen} />
        <Stack.Screen name="KycStatus"   component={KycStatusScreen} />

        {/* Shared */}
        <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
        <Stack.Screen name="VehicleRegistration" component={VehicleRegistrationScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="Rating" component={RatingScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="WalletTransfer" component={WalletTransferScreen} />
        <Stack.Screen name="DriverQR" component={DriverQRScreen} />
        <Stack.Screen name="RiderScanPay" component={RiderScanPayScreen} />
        <Stack.Screen name="Settings"      component={SettingsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Support"       component={SupportScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="Terms"         component={TermsScreen} />
    </Stack.Navigator>
);

// ── AppNavigator — onboarding + auth check ────────────────────────────────────

const AppNavigator = () => {
    const { isAuthenticated, loading } = useAuth();
    const navRef = useRef(null);

    const onNavReady = () => {
        notificationsService.setNavigationRef(navRef.current);
        notificationsService.startListeners();
    };

    if (loading) return <LoadingScreen />;

    return (
        <NavigationContainer ref={navRef} onReady={onNavReady}>
            {isAuthenticated ? <MainStack /> : <GuestStack />}
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loading:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
});

export default AppNavigator;
