'use client'

import React from 'react'
import { FileIcon, FolderIcon, ExternalLink } from 'lucide-react'

// Define the file structure based on API response
interface DriveFile {
    id: string
    name: string
    mimeType: string
    webViewLink?: string
    iconLink?: string
    thumbnailLink?: string
    modifiedTime?: string
    size?: string
}

interface FileExplorerProps {
    files: DriveFile[]
    isLoading: boolean
    onRefresh: () => void
    onFileSelect?: (file: DriveFile) => void
}

export function FileExplorer({ files, isLoading, onRefresh, onFileSelect }: FileExplorerProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-800 h-40 rounded-lg"></div>
                ))}
            </div>
        )
    }

    if (files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <FolderIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">No files found</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((file) => (
                <div
                    key={file.id}
                    onClick={() => {
                        if (onFileSelect) {
                            onFileSelect(file)
                        } else if (file.webViewLink) {
                            window.open(file.webViewLink, '_blank')
                        }
                    }}
                    className="group relative bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-indigo-500/50 rounded-xl p-4 transition-all flex flex-col items-center text-center gap-3 cursor-pointer"
                    title={file.name}
                >
                    {!onFileSelect && (
                        <div className="w-full flex justify-end absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white" />
                        </div>
                    )}

                    <div className="w-16 h-16 flex items-center justify-center bg-gray-900/50 rounded-lg text-4xl overflow-hidden">
                        {file.thumbnailLink ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                        ) : file.mimeType.includes('folder') ? (
                            <FolderIcon className="w-10 h-10 text-yellow-500" />
                        ) : (
                            // Default icon
                            <FileIcon className="w-10 h-10 text-indigo-400" />
                        )}
                    </div>

                    <div className="w-full overflow-hidden">
                        <p className="items-center text-sm font-medium text-gray-200 truncate w-full">
                            {file.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {new Date(file.modifiedTime || '').toLocaleDateString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
