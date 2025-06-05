import React, { useEffect, useRef, useCallback } from 'react';
import {
    FlatList,
    View,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Text,
    ListRenderItem,
} from 'react-native';
import { MessageBubble } from './MessageBubble';
import { Message, User } from '../types';
import { format, isSameDay } from 'date-fns';

interface MessageListProps {
    messages: Message[];
    currentUser: User;
    loading?: boolean;
    refreshing?: boolean;
    hasMore?: boolean;
    onRefresh?: () => void;
    onLoadMore?: () => void;
    onMessagePress?: (message: Message) => void;
    onMessageLongPress?: (message: Message) => void;
}

interface MessageWithDate extends Message {
    showDateSeparator?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    currentUser,
    loading = false,
    refreshing = false,
    hasMore = false,
    onRefresh,
    onLoadMore,
    onMessagePress,
    onMessageLongPress,
}) => {
    const flatListRef = useRef<FlatList>(null);

    // Process messages to add date separators
    const processedMessages = useCallback((): MessageWithDate[] => {
        const processed: MessageWithDate[] = [];

        messages.forEach((message, index) => {
            const currentDate = new Date(message.timestamp);
            const previousDate = index > 0 ? new Date(messages[index - 1].timestamp) : null;

            // Add date separator if this is the first message or date changed
            if (!previousDate || !isSameDay(currentDate, previousDate)) {
                processed.push({
                    ...message,
                    showDateSeparator: true,
                });
            } else {
                processed.push(message);
            }
        });

        return processed;
    }, [messages]);

    const scrollToBottom = useCallback(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages.length]);

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        scrollToBottom();
    }, [messages.length, scrollToBottom]);

    const handleEndReached = useCallback(() => {
        if (hasMore && !loading && onLoadMore) {
            onLoadMore();
        }
    }, [hasMore, loading, onLoadMore]);

    const renderMessage: ListRenderItem<MessageWithDate> = useCallback(({ item, index }) => {
        const isOwn = item.sender_id === currentUser.id;
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
        const showTimestamp = !nextMessage ||
            new Date(item.timestamp).getTime() - new Date(nextMessage.timestamp).getTime() > 300000; // 5 minutes

        return (
            <View>
                {item.showDateSeparator && (
                    <View style={styles.dateSeparator}>
                        <Text style={styles.dateText}>
                            {format(new Date(item.timestamp), 'MMMM dd, yyyy')}
                        </Text>
                    </View>
                )}
                <MessageBubble
                    message={item}
                    isOwn={isOwn}
                    showTimestamp={showTimestamp}
                    onPress={onMessagePress}
                    onLongPress={onMessageLongPress}
                />
            </View>
        );
    }, [currentUser.id, messages, onMessagePress, onMessageLongPress]);

    const renderFooter = useCallback(() => {
        if (!loading) return null;

        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Loading more messages...</Text>
            </View>
        );
    }, [loading]);

    const renderEmpty = useCallback(() => {
        if (loading) return null;

        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
        );
    }, [loading]);

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={processedMessages()}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.1}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#007AFF"
                        />
                    ) : undefined
                }
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 10,
                }}
                removeClippedSubviews={true}
                maxToRenderPerBatch={20}
                windowSize={21}
                initialNumToRender={20}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    list: {
        flex: 1,
    },
    contentContainer: {
        paddingVertical: 8,
        flexGrow: 1,
    },
    dateSeparator: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dateText: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    loadingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
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
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});
