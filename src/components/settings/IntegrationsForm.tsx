'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Check, X, HardDrive } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserIntegration } from '@/types'

export function IntegrationsForm() {
    const [integrations, setIntegrations] = useState<UserIntegration[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editLabel, setEditLabel] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        loadIntegrations()

        // Handle success/error params
        const success = searchParams.get('success')
        const error = searchParams.get('error')
        if (success === 'integration_connected') {
            // clear params
            router.replace('/dashboard/settings')
        }
    }, [])

    const loadIntegrations = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('user_integrations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (data) setIntegrations(data)
        }
        setLoading(false)
    }

    const handleConnect = async () => {
        // Get user ID from client-side before redirecting
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            alert('You must be logged in to connect a drive')
            return
        }
        window.location.href = `/api/auth/google?userId=${user.id}`
    }

    const handleDelete = async (id: string) => {
        // If not in confirm mode, enter confirm mode
        if (deletingId !== id) {
            setDeletingId(id)
            // Auto-reset after 3 seconds if not confirmed
            setTimeout(() => setDeletingId(prev => prev === id ? null : prev), 3000)
            return
        }

        // In confirm mode - proceed with delete
        console.log('[IntegrationsForm] Deleting integration:', id)
        setDeletingId(null)

        try {
            const response = await fetch(`/api/integrations?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setIntegrations(prev => prev.filter(i => i.id !== id))
            } else {
                alert('Failed to delete integration')
            }
        } catch (err) {
            console.error('Delete error:', err)
            alert('Failed to delete integration')
        }
    }

    const startEdit = (integration: UserIntegration) => {
        setEditingId(integration.id)
        setEditLabel(integration.label)
    }

    const saveEdit = async (id: string) => {
        const { error } = await supabase
            .from('user_integrations')
            .update({ label: editLabel })
            .eq('id', id)

        if (!error) {
            setIntegrations(prev => prev.map(i => i.id === id ? { ...i, label: editLabel } : i))
            setEditingId(null)
        } else {
            alert('Failed to update label')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white">Connected Accounts</h3>
                    <p className="text-sm text-gray-400">Manage your external drive connections.</p>
                </div>
                <button
                    onClick={handleConnect}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Google Drive
                </button>
            </div>

            <div className="space-y-3">
                {integrations.map(integration => (
                    <div key={integration.id} className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                {integration.provider === 'google' && (
                                    <HardDrive className="w-5 h-5 text-blue-400" />
                                )}
                            </div>
                            <div>
                                {editingId === integration.id ? (
                                    <input
                                        value={editLabel}
                                        onChange={e => setEditLabel(e.target.value)}
                                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                        autoFocus
                                    />
                                ) : (
                                    <h4 className="font-medium text-gray-200">{integration.label}</h4>
                                )}
                                <p className="text-xs text-gray-500">Connected on {new Date(integration.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {editingId === integration.id ? (
                                <>
                                    <button onClick={() => saveEdit(integration.id)} className="p-2 text-green-400 hover:bg-green-400/10 rounded">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-700 rounded">
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => startEdit(integration)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition" title="Rename">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            )}

                            <button
                                onClick={() => handleDelete(integration.id)}
                                className={`p-2 rounded transition flex items-center gap-1 text-xs ${deletingId === integration.id ? 'bg-red-500/20 text-red-400' : 'text-red-400 hover:text-red-300 hover:bg-red-400/10'}`}
                                title="Disconnect"
                            >
                                <Trash2 className="w-4 h-4" />
                                {deletingId === integration.id && <span className="font-medium">Confirm?</span>}
                            </button>
                        </div>
                    </div>
                ))}

                {integrations.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500 bg-gray-800/20 rounded-xl border border-dashed border-gray-700">
                        <p>No accounts connected.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
