'use client'

import React from 'react'
import {
    FileIcon,
    FolderIcon,
    ExternalLink,
    ChevronRight,
    FileText,
    FileImage,
    FileSpreadsheet,
    FileVideo,
    FileAudio,
    FileCode,
    Presentation,
    File,
    FileArchive
} from 'lucide-react'

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
    parents?: string[]
}

interface FileExplorerProps {
    files: DriveFile[]
    isLoading: boolean
    onRefresh: () => void
    onFileSelect?: (file: DriveFile) => void
    onFolderOpen?: (folderId: string, folderName: string) => void
}

// Get icon and color based on MIME type
const getFileIcon = (mimeType: string): { icon: React.ReactNode; bgColor: string; iconColor: string } => {
    // Google Drive types
    if (mimeType === 'application/vnd.google-apps.folder') {
        return { icon: <FolderIcon className="w-10 h-10" />, bgColor: 'bg-yellow-500/20', iconColor: 'text-yellow-400' }
    }
    if (mimeType === 'application/vnd.google-apps.document') {
        return { icon: <FileText className="w-10 h-10" />, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-400' }
    }
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        return { icon: <FileSpreadsheet className="w-10 h-10" />, bgColor: 'bg-green-500/20', iconColor: 'text-green-400' }
    }
    if (mimeType === 'application/vnd.google-apps.presentation') {
        return { icon: <Presentation className="w-10 h-10" />, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-400' }
    }
    if (mimeType === 'application/vnd.google-apps.form') {
        return { icon: <FileText className="w-10 h-10" />, bgColor: 'bg-purple-500/20', iconColor: 'text-purple-400' }
    }

    // Standard MIME types
    if (mimeType.startsWith('image/')) {
        return { icon: <FileImage className="w-10 h-10" />, bgColor: 'bg-pink-500/20', iconColor: 'text-pink-400' }
    }
    if (mimeType.startsWith('video/')) {
        return { icon: <FileVideo className="w-10 h-10" />, bgColor: 'bg-red-500/20', iconColor: 'text-red-400' }
    }
    if (mimeType.startsWith('audio/')) {
        return { icon: <FileAudio className="w-10 h-10" />, bgColor: 'bg-indigo-500/20', iconColor: 'text-indigo-400' }
    }
    if (mimeType.includes('pdf')) {
        return { icon: <FileText className="w-10 h-10" />, bgColor: 'bg-red-600/20', iconColor: 'text-red-500' }
    }
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) {
        return { icon: <FileArchive className="w-10 h-10" />, bgColor: 'bg-amber-500/20', iconColor: 'text-amber-400' }
    }
    if (mimeType.includes('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
        return { icon: <FileCode className="w-10 h-10" />, bgColor: 'bg-cyan-500/20', iconColor: 'text-cyan-400' }
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return { icon: <FileSpreadsheet className="w-10 h-10" />, bgColor: 'bg-green-500/20', iconColor: 'text-green-400' }
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
        return { icon: <FileText className="w-10 h-10" />, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-400' }
    }
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
        return { icon: <Presentation className="w-10 h-10" />, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-400' }
    }

    // Default
    return { icon: <File className="w-10 h-10" />, bgColor: 'bg-gray-500/20', iconColor: 'text-gray-400' }
}

export function FileExplorer({ files, isLoading, onRefresh, onFileSelect, onFolderOpen }: FileExplorerProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-800 h-40 rounded-xl"></div>
                ))}
            </div>
        )
    }

    if (files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <FolderIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">No files found</p>
                <p className="text-sm mt-2">This folder is empty</p>
            </div>
        )
    }

    const isFolder = (mimeType: string) => mimeType === 'application/vnd.google-apps.folder'

    const handleClick = (file: DriveFile) => {
        if (isFolder(file.mimeType)) {
            // Navigate into folder
            if (onFolderOpen) {
                onFolderOpen(file.id, file.name)
            }
        } else if (onFileSelect) {
            onFileSelect(file)
        } else if (file.webViewLink) {
            window.open(file.webViewLink, '_blank')
        }
    }

    const formatFileSize = (bytes?: string) => {
        if (!bytes) return ''
        const size = parseInt(bytes)
        if (size < 1024) return `${size} B`
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
        if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((file) => {
                const { icon, bgColor, iconColor } = getFileIcon(file.mimeType)

                return (
                    <div
                        key={file.id}
                        onClick={() => handleClick(file)}
                        className="group relative bg-gray-800/40 hover:bg-gray-800/80 border border-gray-700/50 hover:border-indigo-500/50 rounded-xl p-4 transition-all duration-200 flex flex-col items-center text-center gap-3 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5"
                        title={file.name}
                    >
                        {/* External link for files, folder arrow for folders */}
                        <div className="w-full flex justify-end absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isFolder(file.mimeType) ? (
                                <ChevronRight className="w-4 h-4 text-yellow-400" />
                            ) : !onFileSelect && (
                                <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white" />
                            )}
                        </div>

                        {/* File Icon */}
                        <div className={`w-16 h-16 flex items-center justify-center rounded-xl ${bgColor} ${iconColor} overflow-hidden transition-transform group-hover:scale-105`}>
                            {file.thumbnailLink ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                            ) : (
                                icon
                            )}
                        </div>

                        {/* File Name */}
                        <div className="w-full overflow-hidden">
                            <p className="text-sm font-medium text-gray-200 truncate w-full group-hover:text-white transition-colors">
                                {file.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}
                                {file.size && !isFolder(file.mimeType) && (
                                    <span className="ml-2">{formatFileSize(file.size)}</span>
                                )}
                            </p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
