'use client';
import { Message } from '../../types';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, WifiOff } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

const StatusIcon = ({ status }: { status: Message['status'] }) => {
  switch (status) {
    case 'pending': return <Clock className="h-3 w-3 text-white/30" />;
    case 'sent': return <Check className="h-3 w-3 text-white/40" />;
    case 'delivered': return <CheckCheck className="h-3 w-3 text-white/40" />;
    case 'read': return <CheckCheck className="h-3 w-3 text-brand-400" />;
    default: return <WifiOff className="h-3 w-3 text-yellow-500/70" />;
  }
};

export default function MessageBubble({ message, isOwn, showAvatar }: Props) {
  if (message.isDeleted) {
    return (
      <div className={clsx('flex items-end gap-2 mb-1', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="rounded-2xl px-3.5 py-2 text-xs text-white/30 italic border border-surface-4 bg-surface-2">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex items-end gap-2 msg-enter', isOwn ? 'flex-row-reverse' : 'flex-row', showAvatar ? 'mt-3' : 'mt-0.5')}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-7">
        {!isOwn && showAvatar && (
          <img
            src={message.sender.avatar}
            alt={message.sender.username}
            className="h-7 w-7 rounded-full object-cover"
          />
        )}
      </div>

      <div className={clsx('flex flex-col max-w-xs lg:max-w-md xl:max-w-lg', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name for groups */}
        {!isOwn && showAvatar && (
          <span className="text-xs text-white/50 mb-1 ml-1">{message.sender.username}</span>
        )}

        {/* Reply context */}
        {message.replyTo && (
          <div className={clsx('mb-1 rounded-lg border-l-2 border-brand-500 px-2.5 py-1.5 text-xs text-white/50 bg-surface-3 max-w-full',
            isOwn ? 'mr-1' : 'ml-1')}>
            <span className="truncate block">{(message.replyTo as any).content}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={clsx(
            'relative rounded-2xl px-3.5 py-2 text-sm break-words',
            isOwn
              ? 'bg-brand-600 text-white rounded-br-sm'
              : 'bg-surface-3 text-white/90 rounded-bl-sm',
            message.status === 'pending' && 'opacity-70'
          )}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

          {/* Time + status */}
          <div className={clsx('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
            <span className="text-xs opacity-50">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
            {isOwn && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>
    </div>
  );
}
