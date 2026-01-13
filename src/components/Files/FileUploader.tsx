'use client'

import React, { useCallback, useState } from 'react'
import { UploadCloud } from 'lucide-react'

interface FileUploaderProps {
    onUploadComplete: () => void
    integrationId?: string | null
}

export function FileUploader({ onUploadComplete, integrationId }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files)
        }
    }, [integrationId])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files)
        }
    }

    const handleUpload = async (files: FileList) => {
        setIsUploading(true)

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData()
                formData.append('file', file)
                if (integrationId) {
                    formData.append('integrationId', integrationId)
                }

                const response = await fetch('/api/drive/upload', {
                    method: 'POST',
                    body: formData
                })

                if (!response.ok) throw new Error('Upload failed')
                return response.json()
            })

            await Promise.all(uploadPromises)
            onUploadComplete()
        } catch (error) {
            console.error("Upload error:", error)
            alert("Failed to upload files.")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
        border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
        ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-500 bg-gray-800/30'}
      `}
        >
            <input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={handleFileSelect}
            />

            {isUploading ? (
                <div className="flex flex-col items-center animate-pulse">
                    <UploadCloud className="w-10 h-10 text-indigo-400 mb-2" />
                    <span className="text-indigo-300 font-medium">Uploading...</span>
                </div>
            ) : (
                <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                    <UploadCloud className={`w-10 h-10 mb-3 ${isDragging ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <p className="text-gray-300 font-medium">Click or drag files here to upload</p>
                    <p className="text-xs text-gray-500 mt-1">Supports any file type</p>
                </label>
            )}
        </div>
    )
}
