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

// Update type to include 'activity'
export type NavTab = 'channels' | 'dms' | 'activity' | 'settings' | 'files'

interface SidebarNavProps {
    activeTab: NavTab
    onTabSelect: (tab: NavTab) => void
}

interface NavButtonProps {
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

function NavButton({ isActive, onClick, icon, label }: NavButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`
                relative w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-200 group
                ${isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
            `}
            title={label}
        >
            {icon}
            <span className={`
                absolute left-full ml-4 px-3 py-1.5 rounded-md text-sm font-medium
                bg-gray-700 text-white whitespace-nowrap opacity-0 pointer-events-none
                group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200
                ${isActive ? 'group-hover:bg-indigo-600' : 'group-hover:bg-gray-700'}
            `}>
                {label}
            </span>
        </button>
    );
}

export default function SidebarNav({ activeTab, onTabSelect }: SidebarNavProps) {
    return (
        <div className="w-[72px] theme-bg-tertiary flex flex-col items-center py-6 gap-6 border-r theme-border shrink-0 z-50 relative h-full"> {/* Added z-50, relative, and h-full */}
            {/* Activity Button (Uses Custom Logo) */}
            <button
                onClick={() => onTabSelect('activity')}
                title="Activity"
                className={`
                    w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20 mb-2 transition-all duration-200 group relative overflow-hidden
                    ${activeTab === 'activity' ? 'bg-indigo-500 scale-105' : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:scale-105 hover:shadow-purple-500/30'}
                `}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />

                {/* Tooltip for top custom button */}
                <span className="absolute left-full ml-4 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-700 text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50">
                    Activity
                </span>
            </button>

            {/* Separator */}
            <div className="w-8 h-px bg-gray-800" />

            {/* Nav Items */}

            {/* 1. Channels */}
            <NavButton
                isActive={activeTab === 'channels'}
                onClick={() => onTabSelect('channels')}
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                }
                label="Channels"
            />

            {/* 2. Files */}
            <NavButton
                isActive={activeTab === 'files'}
                onClick={() => onTabSelect('files')}
                icon={<HardDrive className="w-6 h-6" />}
                label="Files"
            />

            {/* 3. DMs (Mail Icon) */}
            <NavButton
                isActive={activeTab === 'dms'}
                onClick={() => onTabSelect('dms')}
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                }
                label="Chat"
            />

            {/* 4. Settings */}
            <div className="mt-auto mb-2">
                <NavButton
                    isActive={activeTab === 'settings'}
                    onClick={() => onTabSelect('settings')}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                    label="Settings"
                />
            </div>

        </div>
    )
}
