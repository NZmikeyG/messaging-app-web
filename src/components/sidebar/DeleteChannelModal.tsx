import React, { useState } from 'react'

interface DeleteChannelModalProps {
    isOpen: boolean
    onClose: () => void
    onDelete: () => Promise<void>
    channelName: string
}

export const DeleteChannelModal: React.FC<DeleteChannelModalProps> = ({
    isOpen,
    onClose,
    onDelete,
    channelName,
}) => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDelete = async () => {
        try {
            setIsLoading(true)
            setError(null)
            await onDelete()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to delete channel')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[200]">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <h2 className="text-xl font-bold mb-2 text-gray-900">Delete Channel</h2>
                <p className="text-gray-600 mb-6">
                    Are you sure you want to delete <span className="font-semibold">{channelName}</span>?
                    This action cannot be undone.
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded font-medium disabled:opacity-50"
                    >
                        {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}
