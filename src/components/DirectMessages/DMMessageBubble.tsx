'use client';

import { DirectMessage } from '@/lib/supabase/directMessages';

interface DMMessageBubbleProps {
  message: DirectMessage;
  isOwn: boolean;
}

export default function DMMessageBubble({
  message,
  isOwn,
}: DMMessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-purple-600 text-white'
            : 'bg-neutral-700 text-gray-100'
        }`}
      >
        <p className="break-words">{message.content}</p>
        <p
          className={`text-xs mt-1 ${
            isOwn ? 'text-purple-200' : 'text-gray-400'
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
