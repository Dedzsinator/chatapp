import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

interface SettingsScreenProps {
    navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
    const { user, logout } = useAuthStore();
    const { disconnectWebSocket } = useChatStore();

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await disconnectWebSocket();
                            await logout();
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ]
        );
    };

    const handleProfile = () => {
        navigation.navigate('Profile');
    };

    const handleNotifications = () => {
        navigation.navigate('NotificationSettings');
    };

    const handlePrivacy = () => {
        navigation.navigate('PrivacySettings');
    };

    const handleAbout = () => {
        Alert.alert(
            'About RealChat',
            'Version 1.0.0\n\nA high-performance messaging application built with React Native and Elixir.',
            [{ text: 'OK' }]
        );
    };

    const renderSettingItem = (
        icon: string,
        title: string,
        subtitle?: string,
        onPress?: () => void,
        rightElement?: React.ReactNode
    ) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.settingIcon}>
                <Ionicons name={icon as any} size={20} color="#007AFF" />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {rightElement || (onPress && (
                <Ionicons name="chevron-forward" size={16} color="#CCC" />
            ))}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                </View>
                <Text style={styles.username}>{user?.username || 'Unknown User'}</Text>
                <Text style={styles.email}>{user?.email || 'unknown@example.com'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                {renderSettingItem(
                    'person-outline',
                    'Profile',
                    'Update your profile information',
                    handleProfile
                )}
                {renderSettingItem(
                    'shield-outline',
                    'Privacy & Security',
                    'Manage your privacy settings',
                    handlePrivacy
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                {renderSettingItem(
                    'notifications-outline',
                    'Push Notifications',
                    'Manage notification preferences',
                    handleNotifications
                )}
                {renderSettingItem(
                    'moon-outline',
                    'Do Not Disturb',
                    'Silence notifications temporarily',
                    undefined,
                    <Switch value={false} onValueChange={() => { }} />
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chat</Text>
                {renderSettingItem(
                    'chatbubble-outline',
                    'Chat Backup',
                    'Backup your conversations',
                    () => Alert.alert('Info', 'Chat backup feature coming soon!')
                )}
                {renderSettingItem(
                    'color-palette-outline',
                    'Theme',
                    'Choose your preferred theme',
                    () => Alert.alert('Info', 'Theme selection coming soon!')
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Support</Text>
                {renderSettingItem(
                    'help-circle-outline',
                    'Help & Support',
                    'Get help and contact support',
                    () => Alert.alert('Info', 'Help & Support coming soon!')
                )}
                {renderSettingItem(
                    'information-circle-outline',
                    'About',
                    'App version and information',
                    handleAbout
                )}
            </View>

            <View style={styles.section}>
                {renderSettingItem(
                    'log-out-outline',
                    'Sign Out',
                    undefined,
                    handleLogout
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>RealChat v1.0.0</Text>
                <Text style={styles.footerText}>© 2025 RealChat. All rights reserved.</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    header: {
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E0E0E0',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '600',
    },
    username: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#666',
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginTop: 24,
        paddingVertical: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginLeft: 16,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
    },
    settingIcon: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        color: '#000',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
    },
    footerText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginBottom: 4,
    },
});
