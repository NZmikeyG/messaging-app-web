'use client'

import React, { useEffect, useState } from 'react'
import { FileExplorer } from './FileExplorer'
import { X } from 'lucide-react'

interface FilePickerModalProps {
    isOpen: boolean
    onClose: () => void
    onFileSelect: (file: any) => void
}

export function FilePickerModal({ isOpen, onClose, onFileSelect }: FilePickerModalProps) {
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(true)

    const loadFiles = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/drive/list')
            const data = await res.json()
            if (data.files) {
                setFiles(data.files)
            }
        } catch (error) {
            console.error('Failed to load files:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadFiles()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1e1e24] w-full max-w-4xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col border border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white">Select a File</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 hover:bg-gray-700/50 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <FileExplorer
                        files={files}
                        isLoading={loading}
                        onRefresh={loadFiles}
                        onFileSelect={(file) => {
                            onFileSelect(file)
                            onClose()
                        }}
                    />
                </div>

            </div>
        </div>
    )
}
