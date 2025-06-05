import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthStore } from './src/stores/authStore';
import {
    LoginScreen,
    ChatListScreen,
    ChatScreen,
    SettingsScreen
} from './src/screens';

const Stack = createStackNavigator();
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
    },
});

function AuthenticatedStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#FFFFFF',
                },
                headerTintColor: '#007AFF',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerBackTitleVisible: false,
            }}
        >
            <Stack.Screen
                name="ChatList"
                component={ChatListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={({ route }) => ({
                    title: route.params?.chatName || 'Chat',
                    headerBackTitle: 'Chats',
                })}
            />
            <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    title: 'Settings',
                    headerBackTitle: 'Chats',
                }}
            />
        </Stack.Navigator>
    );
}

function UnauthenticatedStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
    );
}

export default function App() {
    const { isAuthenticated, token, initializeAuth } = useAuthStore();

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <NavigationContainer>
                        {isAuthenticated && token ? (
                            <AuthenticatedStack />
                        ) : (
                            <UnauthenticatedStack />
                        )}
                    </NavigationContainer>
                    <StatusBar style="auto" />
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
