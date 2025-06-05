import { Message } from '../types';

export const generateMessageId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createOptimisticMessage = (
  chatId: string,
  senderId: string,
  content: string
): Message => {
  return {
    id: generateMessageId(),
    chat_id: chatId,
    sender_id: senderId,
    content,
    timestamp: new Date().toISOString(),
    status: 'sending',
    type: 'text',
    metadata: {},
  };
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

export const sanitizeMessage = (content: string): string => {
  // Basic sanitization - remove or escape potentially harmful content
  return content
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

export const parseMessageLinks = (content: string): string => {
  // Simple URL detection and replacement
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
};

export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

export const isMessageFromToday = (timestamp: string): boolean => {
  const messageDate = new Date(timestamp);
  const today = new Date();
  
  return (
    messageDate.getDate() === today.getDate() &&
    messageDate.getMonth() === today.getMonth() &&
    messageDate.getFullYear() === today.getFullYear()
  );
};
