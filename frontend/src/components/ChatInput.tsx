import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Keyboard,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../stores/chatStore';

interface ChatInputProps {
    chatId: string;
    disabled?: boolean;
    placeholder?: string;
    onSendMessage?: (content: string) => void;
    onTypingStart?: () => void;
    onTypingStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    chatId,
    disabled = false,
    placeholder = 'Type a message...',
    onSendMessage,
    onTypingStart,
    onTypingStop,
}) => {
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    const { sendMessage, isConnected } = useChatStore();

    const handleTypingStart = useCallback(() => {
        if (!isTyping) {
            setIsTyping(true);
            onTypingStart?.();
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            onTypingStop?.();
        }, 3000);
    }, [isTyping, onTypingStart, onTypingStop]);

    const handleTypingStop = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (isTyping) {
            setIsTyping(false);
            onTypingStop?.();
        }
    }, [isTyping, onTypingStop]);

    const handleChangeText = useCallback((text: string) => {
        setMessage(text);

        if (text.length > 0) {
            handleTypingStart();
        } else {
            handleTypingStop();
        }
    }, [handleTypingStart, handleTypingStop]);

    const handleSend = useCallback(async () => {
        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
            return;
        }

        if (!isConnected) {
            Alert.alert(
                'Connection Error',
                'You are not connected. Please check your internet connection and try again.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            // Clear input immediately for better UX
            setMessage('');
            handleTypingStop();

            // Send message through store or callback
            if (onSendMessage) {
                onSendMessage(trimmedMessage);
            } else {
                await sendMessage(chatId, trimmedMessage);
            }

            // Dismiss keyboard on mobile
            if (Platform.OS !== 'web') {
                Keyboard.dismiss();
            }
        } catch (error) {
            console.error('Failed to send message:', error);

            // Restore message in input if sending failed
            setMessage(trimmedMessage);

            Alert.alert(
                'Send Error',
                'Failed to send message. Please try again.',
                [{ text: 'OK' }]
            );
        }
    }, [message, isConnected, chatId, onSendMessage, sendMessage, handleTypingStop]);

    const handleSubmitEditing = useCallback(() => {
        handleSend();
    }, [handleSend]);

    const canSend = message.trim().length > 0 && !disabled && isConnected;

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    ref={inputRef}
                    style={[
                        styles.textInput,
                        disabled && styles.disabledInput,
                    ]}
                    value={message}
                    onChangeText={handleChangeText}
                    onSubmitEditing={handleSubmitEditing}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    multiline
                    maxLength={4000}
                    editable={!disabled}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    textAlignVertical="center"
                />

                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        canSend ? styles.sendButtonActive : styles.sendButtonInactive,
                    ]}
                    onPress={handleSend}
                    disabled={!canSend}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="send"
                        size={20}
                        color={canSend ? '#FFFFFF' : '#999'}
                    />
                </TouchableOpacity>
            </View>

            {!isConnected && (
                <View style={styles.offlineIndicator}>
                    <Ionicons name="cloud-offline" size={16} color="#F44336" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E0E0E0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        ...Platform.select({
            ios: {
                paddingBottom: 8,
            },
            android: {
                paddingBottom: 8,
            },
            web: {
                paddingBottom: 8,
            },
        }),
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F8F8F8',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 40,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        lineHeight: 20,
        maxHeight: 100,
        paddingVertical: 8,
        paddingRight: 8,
        color: '#000',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            },
        }),
    },
    disabledInput: {
        opacity: 0.6,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    sendButtonActive: {
        backgroundColor: '#007AFF',
    },
    sendButtonInactive: {
        backgroundColor: '#E0E0E0',
    },
    offlineIndicator: {
        position: 'absolute',
        top: -8,
        right: 20,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#F44336',
    },
});
