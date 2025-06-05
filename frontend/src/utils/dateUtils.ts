import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

export const formatMessageTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else if (isThisWeek(date)) {
    return format(date, 'EEEE');
  } else {
    return format(date, 'MMM dd');
  }
};

export const formatChatListTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMM dd');
  }
};

export const formatRelativeTime = (timestamp: string | Date): string => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

export const formatFullDateTime = (timestamp: string | Date): string => {
  return format(new Date(timestamp), 'PPP pp');
};
