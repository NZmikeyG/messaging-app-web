'use client'

import React, { useEffect, useState } from 'react'
import { FileExplorer } from '@/components/Files/FileExplorer'
import { FileUploader } from '@/components/Files/FileUploader'
import { RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function FilesPage() {
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(true)
    const [integrations, setIntegrations] = useState<any[]>([])
    const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('default')

    const loadFiles = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (selectedIntegrationId !== 'default') {
                params.append('integrationId', selectedIntegrationId)
            }
            const res = await fetch(`/api/drive/list?${params.toString()}`)
            const data = await res.json()
            if (data.files) {
                setFiles(data.files)
            } else {
                setFiles([])
            }
        } catch (error) {
            console.error('Failed to load files:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadIntegrations = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('user_integrations')
                .select('*')
                .eq('user_id', user.id)

            if (data) setIntegrations(data)
        }
    }

    useEffect(() => {
        loadIntegrations()
    }, [])

    useEffect(() => {
        loadFiles()
    }, [selectedIntegrationId])

    return (
        <div className="h-full flex flex-col theme-bg-primary">
            {/* Header */}
            <div className="h-14 border-b theme-border px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-white">Files</h1>

                    {/* Drive Selector */}
                    <div className="relative">
                        <select
                            value={selectedIntegrationId}
                            onChange={(e) => setSelectedIntegrationId(e.target.value)}
                            className="ml-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5"
                        >
                            <option value="default">Shared Workspace (Default)</option>
                            {integrations.map(integration => (
                                <option key={integration.id} value={integration.id}>
                                    {integration.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={loadFiles}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Upload Section */}
                    <section>
                        <FileUploader
                            onUploadComplete={loadFiles}
                            integrationId={selectedIntegrationId !== 'default' ? selectedIntegrationId : null}
                        />
                    </section>

                    {/* Files List */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                {selectedIntegrationId === 'default' ? 'Workspace Files' : 'Drive Files'}
                            </h2>
                            <span className="text-xs text-gray-500">{files.length} items</span>
                        </div>
                        <FileExplorer files={files} isLoading={loading} onRefresh={loadFiles} />
                    </section>

                </div>
            </div>
        </div>
    )
}
