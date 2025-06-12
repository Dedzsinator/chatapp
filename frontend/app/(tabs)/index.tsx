import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';

export default function ChatListScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, logout } = useAuthStore();
  const { connect, disconnect, isConnected } = useChatStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          RealChat
        </Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: isDark ? '#8E8E93' : '#666666' }]}>
          Welcome, {user?.username}! 👋
        </Text>

        <View style={styles.statusCard}>
          <Text style={[styles.statusTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Connection Status
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, {
              backgroundColor: isConnected ? '#34C759' : '#FF3B30'
            }]} />
            <Text style={[styles.statusText, { color: isDark ? '#8E8E93' : '#666666' }]}>
              {isConnected ? 'Connected to server' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <View style={styles.features}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Features
          </Text>
          <Text style={[styles.feature, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            ⚡ Real-time messaging with WebSockets
          </Text>
          <Text style={[styles.feature, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            🏃‍♀️ Ultra-fast with ScyllaDB
          </Text>
          <Text style={[styles.feature, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            📊 Analytics with ClickHouse
          </Text>
          <Text style={[styles.feature, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            🔄 Redis for real-time presence
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
  },
  features: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  feature: {
    fontSize: 16,
    marginBottom: 12,
    paddingLeft: 8,
  },
});
