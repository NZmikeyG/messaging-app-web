'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar/Sidebar';
import { useUserStore } from '@/store/useUserStore';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { fetchProfile } = useUserProfile();
  const profile = useUserStore((state) => state.profile);
  const [mounted, setMounted] = useState(false);
  const [workspaceId] = useState('2e95c2c3-10f1-472a-8b51-5aefe3938185');
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!profile) {
      fetchProfile(useUserStore.getState().profile?.id || '');
    }
  }, [profile, fetchProfile]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId);
    router.push(`/dashboard/channel/${channelId}`);
  };

  const handleCreateChannel = () => {
    router.push(`/dashboard/create-channel?workspace=${workspaceId}`);
  };

  if (!mounted || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        workspaceId={workspaceId}
        activeChannelId={activeChannelId}
        onChannelSelect={handleChannelSelect}
        onCreateChannel={handleCreateChannel}
        onNewMessage={() => {}}
      />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
