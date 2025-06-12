import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading } = useAuthStore();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            await login(email, password);
            // Navigation will be handled automatically by auth state change
        } catch (error) {
            Alert.alert('Login Failed', 'Invalid email or password');
        }
    };

    const styles = createStyles(isDark);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome to RealChat</Text>
                    <Text style={styles.subtitle}>Sign in to continue</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isLoading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            secureTextEntry
                            autoCapitalize="none"
                            editable={!isLoading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Sign Up</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

function createStyles(isDark: boolean) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
        },
        content: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 32,
        },
        header: {
            alignItems: 'center',
            marginBottom: 48,
        },
        title: {
            fontSize: 32,
            fontWeight: 'bold',
            color: isDark ? '#FFFFFF' : '#000000',
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            color: isDark ? '#8E8E93' : '#666666',
            textAlign: 'center',
        },
        form: {
            width: '100%',
        },
        inputGroup: {
            marginBottom: 24,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: isDark ? '#FFFFFF' : '#000000',
            marginBottom: 8,
        },
        input: {
            height: 48,
            borderWidth: 1,
            borderColor: isDark ? '#38383A' : '#E0E0E0',
            borderRadius: 12,
            paddingHorizontal: 16,
            fontSize: 16,
            backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8',
            color: isDark ? '#FFFFFF' : '#000000',
        },
        button: {
            height: 48,
            backgroundColor: '#007AFF',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 16,
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        buttonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600',
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 32,
        },
        footerText: {
            fontSize: 14,
            color: isDark ? '#8E8E93' : '#666666',
        },
        linkText: {
            fontSize: 14,
            color: '#007AFF',
            fontWeight: '600',
        },
    });
}
