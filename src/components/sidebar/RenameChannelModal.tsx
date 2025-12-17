import React, { useState, useEffect } from 'react'

interface RenameChannelModalProps {
    isOpen: boolean
    onClose: () => void
    onRename: (newName: string) => Promise<void>
    currentName: string
}

export const RenameChannelModal: React.FC<RenameChannelModalProps> = ({
    isOpen,
    onClose,
    onRename,
    currentName,
}) => {
    const [name, setName] = useState(currentName)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setName(currentName)
            setError(null)
        }
    }, [isOpen, currentName])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        try {
            setIsLoading(true)
            setError(null)
            await onRename(name.trim())
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to rename channel')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[200]">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Rename Channel</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        placeholder="Channel name"
                        autoFocus
                        disabled={isLoading}
                    />

                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim() || name === currentName}
                            className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded font-medium disabled:opacity-50"
                        >
                            {isLoading ? 'Renaming...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
