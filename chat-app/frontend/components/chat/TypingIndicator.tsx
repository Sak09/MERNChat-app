'use client';

interface Props {
  users: { userId: string; username: string }[];
}

export default function TypingIndicator({ users }: Props) {
  if (!users.length) return null;

  const label = users.length === 1
    ? `${users[0].username} is typing`
    : `${users.map(u => u.username).join(', ')} are typing`;

  return (
    <div className="flex items-center gap-2 px-2 py-1 animate-fade-in">
      <div className="flex h-8 w-auto items-center gap-1.5 rounded-2xl rounded-bl-sm bg-surface-3 px-3.5 py-2">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-xs text-white/30">{label}</span>
    </div>
  );
}
