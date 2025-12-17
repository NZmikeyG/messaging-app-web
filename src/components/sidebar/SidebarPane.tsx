import React from 'react'

import { useRouter } from 'next/navigation'

interface SidebarPaneProps {
    title: React.ReactNode
    children: React.ReactNode
    headerAction?: React.ReactNode
}

export default function SidebarPane({ title, children, headerAction }: SidebarPaneProps) {
    const router = useRouter()

    return (
        <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 w-64 shrink-0 transition-all duration-300">
            {/* Persistent 'Home' Link */}
            <div className="px-3 pt-3 pb-1">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full text-left px-3 py-2 rounded-lg bg-indigo-900/20 hover:bg-indigo-900/40 border border-indigo-500/30 transition group flex items-center justify-between"
                >
                    <span className="font-bold text-indigo-300 group-hover:text-indigo-200">Harbour Basketball</span>
                    <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Home ↗</span>
                </button>
            </div>

            {/* Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-gray-800 shrink-0">
                <h2 className="font-bold text-white">{title}</h2>
                {headerAction}
            </div>
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    )
}
