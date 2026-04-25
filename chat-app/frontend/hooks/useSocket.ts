'use client';
import { useEffect, useRef } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';
import { useAppDispatch, useAppSelector } from './useAppDispatch';
import {
  addIncomingMessage,
  updateMessageStatus,
  flushOfflineQueue,
} from '../store/slices/messagesSlice';
import {
  updateLastMessage,
  incrementUnread,
  updateParticipantStatus,
} from '../store/slices/conversationsSlice';
import { setTyping, setOnlineStatus, addOnlineUser, removeOnlineUser } from '../store/slices/uiSlice';
import { Message } from '../types';
import toast from 'react-hot-toast';

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const activeConversation = useAppSelector((s) => s.conversations.active);
  const activeRef = useRef(activeConversation);
  activeRef.current = activeConversation;

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();

    // ── ONLINE/OFFLINE ──
    const handleOnline = () => {
      dispatch(setOnlineStatus(true));
      toast.success('Back online — sending queued messages…', { id: 'online' });
      dispatch(flushOfflineQueue());
    };
    const handleOffline = () => {
      dispatch(setOnlineStatus(false));
      toast.error('You are offline. Messages will be queued.', { id: 'offline', duration: Infinity });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ── SOCKET EVENTS ──
    socket.on('connect', () => {
      dispatch(setOnlineStatus(true));
    });

    socket.on('disconnect', () => {
      dispatch(setOnlineStatus(false));
    });

    socket.on('message:new', (message: Message) => {
      dispatch(addIncomingMessage(message));
      dispatch(updateLastMessage({ conversationId: message.conversationId, message }));

      if (message.sender._id !== user._id) {
        dispatch(incrementUnread({ conversationId: message.conversationId, userId: user._id }));
      }
    });

    socket.on('message:ack', ({ clientId, messageId, status, conversationId }: any) => {
      dispatch(updateMessageStatus({ clientId, messageId, status, conversationId }));
    });

    socket.on('message:read', ({ messageIds, userId: readerId, conversationId }: any) => {
      // Update read status in messages
      if (readerId !== user._id) {
        dispatch(updateMessageStatus({ clientId: messageIds[0], messageId: messageIds[0], status: 'read', conversationId }));
      }
    });

    socket.on('typing:start', ({ userId, username, conversationId }: any) => {
      if (userId !== user._id) {
        dispatch(setTyping({ conversationId, userId, username, isTyping: true }));
      }
    });

    socket.on('typing:stop', ({ userId, conversationId }: any) => {
      dispatch(setTyping({ conversationId, userId, username: '', isTyping: false }));
    });

    socket.on('user:online', ({ userId }: any) => {
      dispatch(addOnlineUser(userId));
      dispatch(updateParticipantStatus({ userId, status: 'online' }));
    });

    socket.on('user:offline', ({ userId }: any) => {
      dispatch(removeOnlineUser(userId));
      dispatch(updateParticipantStatus({ userId, status: 'offline' }));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message:new');
      socket.off('message:ack');
      socket.off('message:read');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [isAuthenticated, user, dispatch]);

  const joinConversation = (conversationId: string) => {
    const socket = getSocket();
    socket.emit('conversation:join', conversationId);
  };

  const leaveConversation = (conversationId: string) => {
    const socket = getSocket();
    socket.emit('conversation:leave', conversationId);
  };

  const sendTyping = (conversationId: string, isTyping: boolean) => {
    const socket = getSocket();
    socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
  };

  const sendMessageViaSocket = (data: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      socket.emit('message:send', data, (response: any) => {
        if (response?.error) reject(new Error(response.error));
        else resolve(response);
      });
    });
  };

  return { joinConversation, leaveConversation, sendTyping, sendMessageViaSocket };
};
