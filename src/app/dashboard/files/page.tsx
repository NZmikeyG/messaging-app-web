'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { FileExplorer } from '@/components/Files/FileExplorer'
import { FileUploader } from '@/components/Files/FileUploader'
import { RefreshCw, ChevronRight, Home, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

interface BreadcrumbItem {
    id: string
    name: string
}

export default function FilesPage() {
    const searchParams = useSearchParams()
    const [files, setFiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [integrations, setIntegrations] = useState<any[]>([])
    const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('default')
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
    const [nextPageToken, setNextPageToken] = useState<string | null>(null)

    const loadFiles = useCallback(async (folderId?: string | null, pageToken?: string | null, append?: boolean) => {
        if (append) {
            setLoadingMore(true)
        } else {
            setLoading(true)
            setFiles([])
        }

        try {
            const params = new URLSearchParams()
            if (selectedIntegrationId !== 'default') {
                params.append('integrationId', selectedIntegrationId)
            }
            if (folderId) {
                params.append('folderId', folderId)
            }
            if (pageToken) {
                params.append('pageToken', pageToken)
            }

            const res = await fetch(`/api/drive/list?${params.toString()}`)
            const data = await res.json()

            if (data.files) {
                if (append) {
                    setFiles(prev => [...prev, ...data.files])
                } else {
                    setFiles(data.files)
                }
            }

            setNextPageToken(data.nextPageToken || null)
        } catch (error) {
            console.error('Failed to load files:', error)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [selectedIntegrationId])

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

    // Load integrations on mount
    useEffect(() => {
        loadIntegrations()
    }, [])

    // Read drive from URL query params
    useEffect(() => {
        const driveId = searchParams.get('drive')
        if (driveId) {
            setSelectedIntegrationId(driveId)
        }
    }, [searchParams])

    // Reload files when selected drive changes, reset to root
    useEffect(() => {
        setCurrentFolderId(null)
        setBreadcrumbs([])
        setNextPageToken(null)
        loadFiles(null)
    }, [selectedIntegrationId, loadFiles])

    // Handle folder navigation
    const handleFolderOpen = (folderId: string, folderName: string) => {
        setCurrentFolderId(folderId)
        setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }])
        setNextPageToken(null)
        loadFiles(folderId)
    }

    // Handle breadcrumb navigation
    const navigateToBreadcrumb = (index: number) => {
        if (index === -1) {
            // Go to root
            setCurrentFolderId(null)
            setBreadcrumbs([])
            setNextPageToken(null)
            loadFiles(null)
        } else {
            const crumb = breadcrumbs[index]
            setCurrentFolderId(crumb.id)
            setBreadcrumbs(prev => prev.slice(0, index + 1))
            setNextPageToken(null)
            loadFiles(crumb.id)
        }
    }

    const handleRefresh = () => {
        setNextPageToken(null)
        loadFiles(currentFolderId)
    }

    const handleLoadMore = () => {
        if (nextPageToken) {
            loadFiles(currentFolderId, nextPageToken, true)
        }
    }

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
                    onClick={handleRefresh}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Breadcrumbs */}
            {(breadcrumbs.length > 0 || currentFolderId) && (
                <div className="px-6 py-3 border-b theme-border flex items-center gap-2 text-sm bg-gray-800/30">
                    <button
                        onClick={() => navigateToBreadcrumb(-1)}
                        className="flex items-center gap-1 text-gray-400 hover:text-white transition"
                    >
                        <Home className="w-4 h-4" />
                        <span>Root</span>
                    </button>
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.id}>
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                            <button
                                onClick={() => navigateToBreadcrumb(index)}
                                className={`hover:text-white transition ${index === breadcrumbs.length - 1
                                        ? 'text-white font-medium'
                                        : 'text-gray-400'
                                    }`}
                            >
                                {crumb.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Upload Section - only show at root level */}
                    {!currentFolderId && (
                        <section>
                            <FileUploader
                                onUploadComplete={handleRefresh}
                                integrationId={selectedIntegrationId !== 'default' ? selectedIntegrationId : null}
                            />
                        </section>
                    )}

                    {/* Files List */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                {currentFolderId
                                    ? breadcrumbs[breadcrumbs.length - 1]?.name || 'Folder'
                                    : selectedIntegrationId === 'default'
                                        ? 'Workspace Files'
                                        : 'My Drive'
                                }
                            </h2>
                            <span className="text-xs text-gray-500">{files.length} items</span>
                        </div>

                        <FileExplorer
                            files={files}
                            isLoading={loading}
                            onRefresh={handleRefresh}
                            onFolderOpen={handleFolderOpen}
                        />

                        {/* Load More Button */}
                        {nextPageToken && !loading && (
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-4 h-4" />
                                            <span>Load More Files</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </section>

                </div>
            </div>
        </div>
    )
}
