import React from 'react'
import {
    Bell,
    MessageSquare,
    Mail,
    Calendar,
    Settings,
    HardDrive,
    Box
} from 'lucide-react'

export type NavTab = 'activity' | 'channels' | 'dms' | 'calendar' | 'files' | 'apps' | 'settings'

interface SidebarNavProps {
    activeTab: NavTab
    onTabSelect: (tab: NavTab) => void
}

export default function SidebarNav({ activeTab, onTabSelect }: SidebarNavProps) {
    const navItems = [
        { id: 'activity', icon: Bell, label: 'Activity', disabled: true },
        { id: 'channels', icon: MessageSquare, label: 'Channels', disabled: false },
        { id: 'dms', icon: Mail, label: 'Chat', disabled: false },
        { id: 'calendar', icon: Calendar, label: 'Calendar', disabled: false },
        { id: 'files', icon: HardDrive, label: 'Files', disabled: true },
        { id: 'apps', icon: Box, label: 'Apps', disabled: true },
        { id: 'settings', icon: Settings, label: 'Settings', disabled: false },
    ] as const

    return (
        <div className="flex flex-col items-center py-4 bg-gray-950 border-r border-gray-800 w-16 shrink-0 h-full">
            <div className="space-y-6 w-full flex flex-col items-center">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => !item.disabled && onTabSelect(item.id as NavTab)}
                        disabled={item.disabled}
                        className={`
              group relative flex flex-col items-center justify-center w-full py-2
              transition-colors duration-200
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-800'}
              ${activeTab === item.id ? 'text-indigo-400' : 'text-gray-400'}
            `}
                        title={item.label}
                    >
                        {activeTab === item.id && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r" />
                        )}
                        <item.icon className={`w-6 h-6 mb-1 ${activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
