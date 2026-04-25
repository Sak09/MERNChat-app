'use client';
import { useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { sendMessage } from '../../store/slices/messagesSlice';
import { useSocket } from '../../hooks/useSocket';
import { useTyping } from '../../hooks/useTyping';
import { Send, Smile, Paperclip } from 'lucide-react';
import clsx from 'clsx';

interface Props { conversationId: string; }

export default function MessageInput({ conversationId }: Props) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const isOnline = useAppSelector((s) => s.ui.isOnline);
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendTyping } = useSocket();
  const { onType, stopTyping } = useTyping(conversationId, sendTyping);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    adjustHeight();
    if (e.target.value.trim()) onType();
    else stopTyping();
  };

  const handleSend = useCallback(async () => {
    const text = content.trim();
    if (!text || !user) return;
    setContent('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    stopTyping();

    await dispatch(sendMessage({ conversationId, content: text, currentUser: user }));
  }, [content, conversationId, user, dispatch, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-shrink-0 px-4 py-3 border-t border-surface-3 bg-surface-1">
      {!isOnline && (
        <p className="text-xs text-yellow-500/70 mb-2 text-center">
          Offline — message will be queued and sent when reconnected
        </p>
      )}
      <div className="flex items-end gap-2 rounded-2xl bg-surface-2 border border-surface-4 px-3 py-2">
        <button className="flex-shrink-0 mb-0.5 h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 transition-colors">
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm placeholder-white/20 focus:outline-none leading-relaxed py-0.5"
          style={{ maxHeight: 140 }}
        />

        <button className="flex-shrink-0 mb-0.5 h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 transition-colors">
          <Smile className="h-4 w-4" />
        </button>

        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className={clsx(
            'flex-shrink-0 mb-0.5 flex h-8 w-8 items-center justify-center rounded-xl transition-all',
            content.trim()
              ? 'bg-brand-600 hover:bg-brand-500 text-white active:scale-95'
              : 'bg-surface-4 text-white/20 cursor-not-allowed'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-white/20 text-right mt-1">Shift+Enter for new line</p>
    </div>
  );
}
