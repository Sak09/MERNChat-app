'use client';
import { MessageSquare, Search } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center p-8 bg-surface">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-surface-2 border border-surface-4">
          <MessageSquare className="h-9 w-9 text-white/20" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600/20 border border-brand-600/30">
          <Search className="h-4 w-4 text-brand-400" />
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white/80">Select a conversation</h2>
        <p className="mt-1.5 text-sm text-white/30 max-w-xs leading-relaxed">
          Choose an existing chat from the sidebar, or search for a user to start a new conversation.
        </p>
      </div>
      <div className="flex items-center gap-4 mt-2">
        {[['⚡', 'Real-time'], ['📦', 'Offline Queue'], ['∞', 'Infinite Scroll']].map(([icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="text-xl">{icon}</span>
            <span className="text-xs text-white/30">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
