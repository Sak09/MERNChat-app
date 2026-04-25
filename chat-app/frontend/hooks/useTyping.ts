'use client';
import { useRef, useCallback } from 'react';

export const useTyping = (
  conversationId: string,
  sendTyping: (convId: string, isTyping: boolean) => void
) => {
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const onType = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(conversationId, true);
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }, 2000);
  }, [conversationId, sendTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }
  }, [conversationId, sendTyping]);

  return { onType, stopTyping };
};
