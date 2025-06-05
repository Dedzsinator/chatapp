import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Message, MessageStatus } from '../types';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showTimestamp?: boolean;
    onLongPress?: (message: Message) => void;
    onPress?: (message: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    isOwn,
    showTimestamp = false,
    onLongPress,
    onPress,
}) => {
    const getStatusIcon = () => {
        switch (message.status) {
            case MessageStatus.SENT:
                return <Ionicons name="checkmark" size={12} color="#666" />;
            case MessageStatus.DELIVERED:
                return <Ionicons name="checkmark-done" size={12} color="#666" />;
            case MessageStatus.READ:
                return <Ionicons name="checkmark-done" size={12} color="#4CAF50" />;
            case MessageStatus.FAILED:
                return <Ionicons name="alert-circle" size={12} color="#F44336" />;
            default:
                return <Ionicons name="time" size={12} color="#999" />;
        }
    };

    const handlePress = () => {
        onPress?.(message);
    };

    const handleLongPress = () => {
        onLongPress?.(message);
    };

    return (
        <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
            <TouchableOpacity
                onPress={handlePress}
                onLongPress={handleLongPress}
                delayLongPress={500}
                style={[
                    styles.bubble,
                    isOwn ? styles.ownBubble : styles.otherBubble,
                ]}
                activeOpacity={0.8}
            >
                <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                    {message.content}
                </Text>

                <View style={styles.metaContainer}>
                    <Text style={styles.timestamp}>
                        {format(new Date(message.timestamp), 'HH:mm')}
                    </Text>
                    {isOwn && (
                        <View style={styles.statusIcon}>
                            {getStatusIcon()}
                        </View>
                    )}
                </View>

                {message.edited_at && (
                    <Text style={styles.editedIndicator}>edited</Text>
                )}
            </TouchableOpacity>

            {showTimestamp && (
                <Text style={styles.fullTimestamp}>
                    {format(new Date(message.timestamp), 'MMM dd, yyyy HH:mm')}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 2,
        marginHorizontal: 16,
    },
    ownContainer: {
        alignItems: 'flex-end',
    },
    otherContainer: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    ownBubble: {
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: '#F0F0F0',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    ownText: {
        color: '#FFFFFF',
    },
    otherText: {
        color: '#000000',
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        justifyContent: 'flex-end',
    },
    timestamp: {
        fontSize: 11,
        color: '#FFFFFF80',
        marginRight: 4,
    },
    statusIcon: {
        marginLeft: 4,
    },
    editedIndicator: {
        fontSize: 10,
        color: '#FFFFFF60',
        fontStyle: 'italic',
        textAlign: 'right',
        marginTop: 2,
    },
    fullTimestamp: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        marginTop: 4,
    },
});
