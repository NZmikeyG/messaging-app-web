'use client';

import React, { useState } from 'react';

interface DirectMessage {
  id: string;
  name: string;
  avatar: string;
}

interface DirectMessagesListProps {
  onNewMessage: () => void;
}

export default function DirectMessagesList({
  onNewMessage,
}: DirectMessagesListProps) {
  const [directMessages] = useState<DirectMessage[]>([
    { id: 'dm_1', name: 'John Doe', avatar: 'JD' },
    { id: 'dm_2', name: 'Jane Smith', avatar: 'JS' },
    { id: 'dm_3', name: 'Mike Johnson', avatar: 'MJ' },
  ]);

  return (
    <div>
      {directMessages.map((dm) => (
        <div
          key={dm.id}
          className="px-4 py-2 mx-2 rounded text-sm text-gray-200 hover:bg-gray-800 cursor-pointer transition flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {dm.avatar}
          </div>
          <span className="flex-1 truncate">{dm.name}</span>
        </div>
      ))}

      <div className="mt-2 px-4">
        <button
          onClick={onNewMessage}
          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
        >
          + New message
        </button>
      </div>
    </div>
  );
}
