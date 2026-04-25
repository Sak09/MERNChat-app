'use client';
import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { setActive, getOrCreateDirect } from '../../store/slices/conversationsSlice';
import { logout } from '../../store/slices/authSlice';
import { disconnectSocket } from '../../lib/socket';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Search, LogOut, Users, Plus, X } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Conversation, User } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import clsx from 'clsx';

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { joinConversation, leaveConversation } = useSocket();

  const { list: conversations, active } = useAppSelector((s) => s.conversations);
  const { user } = useAppSelector((s) => s.auth);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleConversationClick = (conv: Conversation) => {
    if (active) leaveConversation(active);
    dispatch(setActive(conv._id));
    joinConversation(conv._id);
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data.data.users);
    } catch {}
    finally { setIsSearching(false); }
  }, []);

  const handleUserSelect = async (targetUser: User) => {
    const result = await dispatch(getOrCreateDirect(targetUser._id));
    if (getOrCreateDirect.fulfilled.match(result)) {
      const conv = result.payload;
      joinConversation(conv._id);
      setShowSearch(false);
      setSearch('');
      setSearchResults([]);
    } else {
      toast.error('Could not open conversation');
    }
  };

  const handleLogout = async () => {
    await dispatch(logout());
    disconnectSocket();
    router.replace('/login');
  };

  const getConvName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.name || 'Group';
    const other = conv.participants.find((p) => p._id !== user?._id);
    return other?.username || 'Unknown';
  };

  const getConvAvatar = (conv: Conversation) => {
    if (conv.type === 'group') return conv.avatar;
    const other = conv.participants.find((p) => p._id !== user?._id);
    return other?.avatar;
  };

  const getConvStatus = (conv: Conversation) => {
    if (conv.type === 'group') return null;
    return conv.participants.find((p) => p._id !== user?._id)?.status;
  };

  const unreadCount = (conv: Conversation) =>
    user ? conv.unreadCount?.[user._id] || 0 : 0;

  return (
    <aside className="flex h-full w-72 flex-col border-r border-surface-3 bg-surface-1 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-surface-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600">
            <MessageSquare className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">ChatApp</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-3 transition-colors"
          >
            {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4 text-white/50" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-3 transition-colors text-white/50 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search panel */}
      {showSearch && (
        <div className="border-b border-surface-3 p-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              autoFocus
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full rounded-lg bg-surface-2 pl-9 pr-3 py-2 text-sm placeholder-white/20 border border-surface-4 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
              {searchResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleUserSelect(u)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-3 transition-colors text-left"
                >
                  <div className="relative">
                    <img src={u.avatar} alt={u.username} className="h-8 w-8 rounded-full" />
                    <span className={clsx('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-1', u.status === 'online' ? 'bg-green-500' : 'bg-surface-4')} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.username}</p>
                    <p className="text-xs text-white/40 truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {search.length >= 2 && searchResults.length === 0 && !isSearching && (
            <p className="mt-2 text-xs text-white/30 text-center py-2">No users found</p>
          )}
        </div>
      )}

      {/* Current user */}
      <div className="px-4 py-3 border-b border-surface-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img src={user?.avatar} alt={user?.username} className="h-8 w-8 rounded-full" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-surface-1" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.username}</p>
            <p className="text-xs text-white/40">Online</p>
          </div>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3">
              <Users className="h-5 w-5 text-white/30" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/60">No conversations</p>
              <p className="text-xs text-white/30 mt-1">Search for a user to start chatting</p>
            </div>
          </div>
        )}
        {conversations.map((conv) => {
          const count = unreadCount(conv);
          const status = getConvStatus(conv);
          return (
            <button
              key={conv._id}
              onClick={() => handleConversationClick(conv)}
              className={clsx(
                'flex w-full items-center gap-3 px-3 py-2.5 mx-1 rounded-xl transition-colors text-left',
                active === conv._id ? 'bg-brand-600/20 border border-brand-600/30' : 'hover:bg-surface-2'
              )}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={getConvAvatar(conv) || ''}
                  alt={getConvName(conv)}
                  className="h-10 w-10 rounded-full object-cover"
                />
                {status && (
                  <span className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-1', status === 'online' ? 'bg-green-500' : 'bg-surface-4')} />
                )}
              </div>
              <div className="flex flex-1 flex-col min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{getConvName(conv)}</span>
                  {conv.lastMessageAt && (
                    <span className="text-xs text-white/30 flex-shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-white/40 truncate">
                    {conv.lastMessage?.isDeleted ? 'Message deleted' : conv.lastMessage?.content || 'No messages yet'}
                  </span>
                  {count > 0 && (
                    <span className="ml-2 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
