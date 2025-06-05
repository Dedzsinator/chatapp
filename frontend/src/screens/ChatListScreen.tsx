import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    RefreshControl,
    Alert,
    Text,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ChatListItem } from '../components';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { Chat } from '../types';

interface ChatListScreenProps {
    navigation: any;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
    const [refreshing, setRefreshing] = useState(false);
    const {
        chats,
        isLoading,
        error,
        fetchChats,
        connectWebSocket,
        disconnectWebSocket,
        clearError
    } = useChatStore();
    const { user, logout } = useAuthStore();

    useFocusEffect(
        useCallback(() => {
            // Connect WebSocket when screen is focused
            connectWebSocket();

            // Fetch latest chats
            fetchChats();

            return () => {
                // Disconnect WebSocket when screen loses focus
                disconnectWebSocket();
            };
        }, [connectWebSocket, disconnectWebSocket, fetchChats])
    );

    useEffect(() => {
        if (error) {
            Alert.alert('Error', error, [
                { text: 'OK', onPress: clearError }
            ]);
        }
    }, [error, clearError]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchChats();
        } finally {
            setRefreshing(false);
        }
    }, [fetchChats]);

    const handleChatPress = useCallback((chat: Chat) => {
        navigation.navigate('Chat', {
            chatId: chat.id,
            chatName: chat.name,
            chatType: chat.type,
        });
    }, [navigation]);

    const handleChatLongPress = useCallback((chat: Chat) => {
        Alert.alert(
            'Chat Options',
            `What would you like to do with ${chat.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Mute', onPress: () => console.log('Mute chat:', chat.id) },
                { text: 'Archive', onPress: () => console.log('Archive chat:', chat.id) },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => console.log('Delete chat:', chat.id)
                },
            ]
        );
    }, []);

    const handleNewChat = useCallback(() => {
        navigation.navigate('NewChat');
    }, [navigation]);

    const handleSettings = useCallback(() => {
        navigation.navigate('Settings');
    }, [navigation]);

    const renderChatItem = useCallback(({ item }: { item: Chat }) => {
        return (
            <ChatListItem
                chat={item}
                currentUser={user!}
                onPress={handleChatPress}
                onLongPress={handleChatLongPress}
            />
        );
    }, [user, handleChatPress, handleChatLongPress]);

    const renderEmpty = useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Loading chats...</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No chats yet</Text>
                <Text style={styles.emptySubtext}>
                    Start a conversation by tapping the + button
                </Text>
                <TouchableOpacity style={styles.startChatButton} onPress={handleNewChat}>
                    <Text style={styles.startChatButtonText}>Start Chatting</Text>
                </TouchableOpacity>
            </View>
        );
    }, [isLoading, handleNewChat]);

    const renderSeparator = useCallback(() => {
        return <View style={styles.separator} />;
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Chats</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleSettings}
                    >
                        <Ionicons name="settings-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleNewChat}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={chats}
                renderItem={renderChatItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#007AFF"
                    />
                }
                ListEmptyComponent={renderEmpty}
                ItemSeparatorComponent={renderSeparator}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E0E0E0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerButton: {
        marginLeft: 16,
        padding: 4,
    },
    list: {
        flex: 1,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#E0E0E0',
        marginLeft: 78,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    startChatButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    startChatButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
