'use client';

import { useEffect, useState, useRef } from 'react';
import { DirectMessage } from '@/lib/supabase/directMessages';
import {
  getMessages,
  sendDirectMessage,
  subscribeToMessages,
} from '@/lib/supabase/directMessages';
import { useUserStore } from '@/store/useUserStore';

interface DMConversationProps {
  recipientId: string;
  recipientName: string;
  recipientStatus: string;
}

export default function DMConversation({
  recipientId,
  recipientName,
  recipientStatus,
}: DMConversationProps) {
  const { profile } = useUserStore();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

    // Fetch initial messages
    const loadMessages = async () => {
      try {
        const data = await getMessages(profile.id, recipientId);
        setMessages(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading messages:', error);
        setLoading(false);
      }
    };

    loadMessages();

    // Subscribe to new messages (polling-based - works on free tier!)
    subscriptionRef.current = subscribeToMessages(
      profile.id,
      recipientId,
      (newMessage) => {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [profile?.id, recipientId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !profile?.id) return;

    const messageContent = inputValue;
    setInputValue('');
    setSending(true);

    try {
      await sendDirectMessage(profile.id, recipientId, messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputValue(messageContent); // Restore message if failed
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-900 text-gray-400">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 p-4 bg-neutral-800">
        <h2 className="text-xl font-bold text-white">{recipientName}</h2>
        <p
          className={`text-sm ${
            recipientStatus === 'online' ? 'text-green-500' : 'text-gray-400'
          }`}
        >
          {recipientStatus === 'online' ? '● Online' : '○ Offline'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 pt-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === profile?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
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
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 p-4 bg-neutral-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !sending) {
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 bg-neutral-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || sending}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
