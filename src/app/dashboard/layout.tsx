'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const workspaceId = searchParams?.get('workspace') || '2e95c2c3-10f1-472a-8b51-5aefe3938185';
  const channelId = searchParams?.get('channel');

  const handleChannelSelect = (id: string) => {
    router.push(`/dashboard?workspace=${workspaceId}&channel=${id}`);
  };

  const handleCreateChannel = () => {
    router.push(`/dashboard/create-channel?workspace=${workspaceId}`);
  };

  const handleNewMessage = () => {
    console.log('New message');
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        workspaceId={workspaceId}
        activeChannelId={channelId}
        onChannelSelect={handleChannelSelect}
        onCreateChannel={handleCreateChannel}
        onNewMessage={handleNewMessage}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
