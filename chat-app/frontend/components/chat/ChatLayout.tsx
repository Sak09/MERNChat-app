'use client';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchConversations } from '../../store/slices/conversationsSlice';
import { useSocket } from '../../hooks/useSocket';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import EmptyState from './EmptyState';

export default function ChatLayout() {
  const dispatch = useAppDispatch();
  const activeConversation = useAppSelector((s) => s.conversations.active);
  const isOnline = useAppSelector((s) => s.ui.isOnline);

  useSocket(); // Initialize socket listeners

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 py-2 text-xs text-yellow-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Offline — messages will be sent when you reconnect
        </div>
      )}

      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {activeConversation ? (
          <ChatWindow conversationId={activeConversation} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
