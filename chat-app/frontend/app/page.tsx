'use client';
import AuthGuard from '../components/AuthGuard';
import ChatLayout from '../components/chat/ChatLayout';

export default function HomePage() {
  return (
    <AuthGuard>
      <ChatLayout />
    </AuthGuard>
  );
}
