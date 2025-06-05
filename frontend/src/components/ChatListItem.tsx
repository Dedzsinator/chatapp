import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Chat, User, Message } from '../types';

interface ChatListItemProps {
    chat: Chat;
    lastMessage?: Message;
    unreadCount?: number;
    isOnline?: boolean;
    currentUser: User;
    onPress: (chat: Chat) => void;
    onLongPress?: (chat: Chat) => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
    chat,
    lastMessage,
    unreadCount = 0,
    isOnline = false,
    currentUser,
    onPress,
    onLongPress,
}) => {
    const handlePress = () => {
        onPress(chat);
    };

    const handleLongPress = () => {
        onLongPress?.(chat);
    };

    const getLastMessagePreview = (): string => {
        if (!lastMessage) {
            return 'No messages yet';
        }

        const isOwn = lastMessage.sender_id === currentUser.id;
        const prefix = isOwn ? 'You: ' : '';

        // Truncate long messages
        const content = lastMessage.content.length > 50
            ? `${lastMessage.content.substring(0, 50)}...`
            : lastMessage.content;

        return `${prefix}${content}`;
    };

    const getLastMessageTime = (): string => {
        if (!lastMessage) {
            return '';
        }

        const messageDate = new Date(lastMessage.timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return format(messageDate, 'HH:mm');
        } else if (diffInHours < 24 * 7) {
            return format(messageDate, 'EEE');
        } else {
            return format(messageDate, 'MMM dd');
        }
    };

    const getChatName = (): string => {
        if (chat.type === 'direct') {
            // For direct chats, show the other participant's name
            // This would need to be resolved from participants data
            return chat.name || 'Direct Chat';
        }
        return chat.name || 'Group Chat';
    };

    const getChatAvatar = () => {
        // For now, show initials or default avatar
        const name = getChatName();
        const initials = name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        return (
            <View style={[styles.avatar, isOnline && styles.onlineAvatar]}>
                <Text style={styles.avatarText}>{initials}</Text>
                {isOnline && <View style={styles.onlineIndicator} />}
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={500}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {getChatAvatar()}
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.chatName} numberOfLines={1}>
                        {getChatName()}
                    </Text>
                    <Text style={styles.timestamp}>
                        {getLastMessageTime()}
                    </Text>
                </View>

                <View style={styles.messageRow}>
                    <Text
                        style={[
                            styles.lastMessage,
                            unreadCount > 0 && styles.unreadMessage,
                        ]}
                        numberOfLines={1}
                    >
                        {getLastMessagePreview()}
                    </Text>

                    {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {chat.type === 'group' && (
                <View style={styles.groupIndicator}>
                    <Ionicons name="people" size={12} color="#666" />
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    onlineAvatar: {
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        flex: 1,
        marginRight: 8,
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginRight: 8,
    },
    unreadMessage: {
        fontWeight: '600',
        color: '#333',
    },
    unreadBadge: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadCount: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    groupIndicator: {
        marginLeft: 8,
    },
});
