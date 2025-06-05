import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    TouchableOpacity,
    Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessageList, ChatInput } from '../components';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { Message } from '../types';

interface ChatScreenProps {
    route: {
        params: {
            chatId: string;
            chatName: string;
            chatType: 'direct' | 'group';
        };
    };
    navigation: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
    const { chatId, chatName, chatType } = route.params;
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const {
        messages,
        isLoading,
        error,
        isConnected,
        fetchMessages,
        sendMessage,
        markAsRead,
        loadMoreMessages,
        joinChat,
        leaveChat,
        clearError,
    } = useChatStore();

    const { user } = useAuthStore();

    // Set up navigation header
    useLayoutEffect(() => {
        navigation.setOptions({
            title: chatName,
            headerRight: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleChatInfo}
                >
                    <Ionicons
                        name={chatType === 'group' ? 'people' : 'person'}
                        size={20}
                        color="#007AFF"
                    />
                </TouchableOpacity>
            ),
        });
    }, [navigation, chatName, chatType]);

    useEffect(() => {
        // Join chat and fetch messages when component mounts
        const initializeChat = async () => {
            try {
                await joinChat(chatId);
                await fetchMessages(chatId);
            } catch (error) {
                console.error('Failed to initialize chat:', error);
            }
        };

        initializeChat();

        // Cleanup: leave chat when component unmounts
        return () => {
            leaveChat(chatId);
        };
    }, [chatId, joinChat, fetchMessages, leaveChat]);

    useEffect(() => {
        // Mark messages as read when chat is opened
        if (messages.length > 0 && user) {
            markAsRead(chatId, user.id);
        }
    }, [messages.length, chatId, user, markAsRead]);

    useEffect(() => {
        if (error) {
            Alert.alert('Error', error, [
                { text: 'OK', onPress: clearError }
            ]);
        }
    }, [error, clearError]);

    const handleSendMessage = useCallback(async (content: string) => {
        if (!user) return;

        try {
            await sendMessage(chatId, content);
        } catch (error) {
            console.error('Failed to send message:', error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
        }
    }, [chatId, user, sendMessage]);

    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || !messages.length) return;

        setIsLoadingMore(true);
        try {
            await loadMoreMessages(chatId, messages[0].id);
        } catch (error) {
            console.error('Failed to load more messages:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [chatId, messages, isLoadingMore, loadMoreMessages]);

    const handleMessagePress = useCallback((message: Message) => {
        // Handle message tap (e.g., show details, react, etc.)
        console.log('Message pressed:', message.id);
    }, []);

    const handleMessageLongPress = useCallback((message: Message) => {
        if (!user) return;

        const isOwn = message.sender_id === user.id;
        const options = [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Copy', onPress: () => handleCopyMessage(message) },
        ];

        if (isOwn) {
            options.push(
                { text: 'Edit', onPress: () => handleEditMessage(message) },
                {
                    text: 'Delete',
                    style: 'destructive' as const,
                    onPress: () => handleDeleteMessage(message)
                }
            );
        } else {
            options.push(
                { text: 'Reply', onPress: () => handleReplyMessage(message) },
                { text: 'Report', onPress: () => handleReportMessage(message) }
            );
        }

        Alert.alert('Message Options', '', options);
    }, [user]);

    const handleCopyMessage = useCallback((message: Message) => {
        // Copy message to clipboard
        console.log('Copy message:', message.content);
    }, []);

    const handleEditMessage = useCallback((message: Message) => {
        // Edit message functionality
        console.log('Edit message:', message.id);
    }, []);

    const handleDeleteMessage = useCallback((message: Message) => {
        Alert.alert(
            'Delete Message',
            'Are you sure you want to delete this message?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // Delete message functionality
                        console.log('Delete message:', message.id);
                    }
                }
            ]
        );
    }, []);

    const handleReplyMessage = useCallback((message: Message) => {
        // Reply to message functionality
        console.log('Reply to message:', message.id);
    }, []);

    const handleReportMessage = useCallback((message: Message) => {
        // Report message functionality
        console.log('Report message:', message.id);
    }, []);

    const handleChatInfo = useCallback(() => {
        navigation.navigate('ChatInfo', {
            chatId,
            chatName,
            chatType
        });
    }, [navigation, chatId, chatName, chatType]);

    const handleTypingStart = useCallback(() => {
        // Send typing indicator
        console.log('User started typing');
    }, []);

    const handleTypingStop = useCallback(() => {
        // Stop typing indicator
        console.log('User stopped typing');
    }, []);

    if (!user) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>User not found</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            <MessageList
                messages={messages}
                currentUser={user}
                loading={isLoadingMore}
                hasMore={true} // This should be determined based on API response
                onLoadMore={handleLoadMore}
                onMessagePress={handleMessagePress}
                onMessageLongPress={handleMessageLongPress}
            />

            <ChatInput
                chatId={chatId}
                disabled={!isConnected}
                onSendMessage={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
            />

            {!isConnected && (
                <View style={styles.offlineBar}>
                    <Ionicons name="cloud-offline" size={16} color="#FFFFFF" />
                    <Text style={styles.offlineText}>Connecting...</Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerButton: {
        marginRight: 16,
        padding: 4,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
    },
    offlineBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F44336',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        zIndex: 1000,
    },
    offlineText: {
        color: '#FFFFFF',
        fontSize: 14,
        marginLeft: 8,
    },
});
