'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchMessages, sendMessage } from '../../store/slices/messagesSlice';
import { clearUnread } from '../../store/slices/conversationsSlice';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useSocket } from '../../hooks/useSocket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import TypingIndicator from './TypingIndicator';
import { Loader2 } from 'lucide-react';

interface Props {
  conversationId: string;
}

export default function ChatWindow({ conversationId }: Props) {
  const dispatch = useAppDispatch();
  const { joinConversation } = useSocket();
  const { user } = useAppSelector((s) => s.auth);
  const messages = useAppSelector((s) => s.messages.byConversation[conversationId] || []);
  const hasMore = useAppSelector((s) => s.messages.hasMore[conversationId] ?? true);
  const isLoading = useAppSelector((s) => s.messages.isLoading[conversationId] ?? false);
  const cursor = useAppSelector((s) => s.messages.cursors[conversationId]);
  const typingUsers = useAppSelector((s) => s.ui.typingUsers[conversationId] || []);
  const conversation = useAppSelector((s) => s.conversations.list.find((c) => c._id === conversationId));

  const isFirstLoad = useRef(true);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      dispatch(fetchMessages({ conversationId, cursor: cursor || undefined }));
    }
  }, [dispatch, conversationId, cursor, isLoading, hasMore]);

  const { containerRef, scrollToBottom } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  });

  // Initial load
  useEffect(() => {
    isFirstLoad.current = true;
    joinConversation(conversationId);
    dispatch(fetchMessages({ conversationId }));
    dispatch(clearUnread({ conversationId, userId: user!._id }));
  }, [conversationId]);

  // Scroll to bottom on new messages (only if near bottom or first load)
  useEffect(() => {
    if (messages.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    if (isFirstLoad.current) {
      scrollToBottom(false);
      isFirstLoad.current = false;
      return;
    }

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) scrollToBottom(true);
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} />

      {/* Messages area with infinite scroll */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
        style={{ overflowAnchor: 'none' }}
      >
        {/* Load more spinner at top */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        )}

        {!hasMore && messages.length > 0 && (
          <p className="text-center text-xs text-white/20 py-3">Beginning of conversation</p>
        )}

        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const showAvatar =
            !prevMsg || prevMsg.sender._id !== msg.sender._id;
          return (
            <MessageBubble
              key={msg._id || msg.clientId}
              message={msg}
              isOwn={msg.sender._id === user?._id}
              showAvatar={showAvatar}
            />
          );
        })}

        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}

        {/* Scroll anchor */}
        <div style={{ height: 1 }} />
      </div>

      <MessageInput conversationId={conversationId} />
    </div>
  );
}
