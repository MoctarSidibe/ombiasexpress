import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ScrollView, Text } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }
    componentDidCatch(error, info) {
        console.error('=== APP CRASH ===');
        console.error('Error:', error?.message);
        console.error('Stack:', error?.stack);
        console.error('Component:', info?.componentStack);
        this.setState({ hasError: true, error, info });
    }
    render() {
        if (this.state.hasError) {
            return (
                <ScrollView style={errStyles.scroll} contentContainerStyle={errStyles.container}>
                    <Text style={errStyles.title}>App Crashed — Error Details</Text>
                    <Text style={errStyles.label}>Message:</Text>
                    <Text style={errStyles.msg}>{this.state.error?.message}</Text>
                    <Text style={errStyles.label}>Stack:</Text>
                    <Text style={errStyles.stack}>{this.state.error?.stack}</Text>
                    <Text style={errStyles.label}>Component Tree:</Text>
                    <Text style={errStyles.stack}>{this.state.info?.componentStack}</Text>
                </ScrollView>
            );
        }
        return this.props.children;
    }
}

export default function App() {
    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={styles.container}>
                <LanguageProvider>
                    <AuthProvider>
                        <AppNavigator />
                        <StatusBar style="auto" />
                    </AuthProvider>
                </LanguageProvider>
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }
});

const errStyles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#1a1a1a' },
    container: { padding: 20, paddingTop: 60 },
    title: { color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    label: { color: '#ffaa00', fontSize: 13, fontWeight: 'bold', marginTop: 12 },
    msg: { color: '#ffffff', fontSize: 14, marginTop: 4 },
    stack: { color: '#aaaaaa', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },
});
