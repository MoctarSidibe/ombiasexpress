import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

// PaymentScreen is superseded by the full Wallet system.
// Redirect immediately to WalletScreen so any existing navigation
// to 'Payment' still works without a dead-end.
const PaymentScreen = () => {
    const navigation = useNavigation();

    useEffect(() => {
        navigation.replace('Wallet');
    }, [navigation]);

    return null;
};

export default PaymentScreen;
