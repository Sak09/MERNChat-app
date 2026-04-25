'use client';
import { useAppSelector } from '../../hooks/useAppDispatch';
import { Conversation } from '../../types';
import { Phone, Video, MoreHorizontal, Users } from 'lucide-react';
import clsx from 'clsx';

interface Props { conversation?: Conversation; }

export default function ChatHeader({ conversation }: Props) {
  const { user } = useAppSelector((s) => s.auth);

  if (!conversation) return <div className="h-16 border-b border-surface-3 bg-surface-1" />;

  const isGroup = conversation.type === 'group';
  const other = !isGroup ? conversation.participants.find((p) => p._id !== user?._id) : null;

  const name = isGroup ? conversation.name || 'Group' : other?.username || 'Unknown';
  const avatar = isGroup ? conversation.avatar : other?.avatar;
  const status = other?.status;

  const statusLabel = isGroup
    ? `${conversation.participants.length} members`
    : status === 'online'
    ? 'Online'
    : other?.lastSeen
    ? `Last seen ${new Date(other.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Offline';

  return (
    <div className="flex h-16 items-center justify-between px-4 border-b border-surface-3 bg-surface-1 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img src={avatar || ''} alt={name} className="h-9 w-9 rounded-full object-cover" />
          {!isGroup && status && (
            <span className={clsx('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-1',
              status === 'online' ? 'bg-green-500' : 'bg-surface-4')} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{name}</p>
          <p className={clsx('text-xs', status === 'online' && !isGroup ? 'text-green-400' : 'text-white/40')}>
            {statusLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {[Phone, Video, MoreHorizontal].map((Icon, i) => (
          <button key={i} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-3 transition-colors text-white/40 hover:text-white">
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
