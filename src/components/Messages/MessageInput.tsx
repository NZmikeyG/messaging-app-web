import React, { useState, useRef } from 'react'
import { FilePickerModal } from '@/components/Files/FilePickerModal'
import { Paperclip } from 'lucide-react'

interface MessageInputProps {
  channelId: string
  onSendMessage: (content: string) => Promise<void>
  isLoading?: boolean
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelId,
  onSendMessage,
  isLoading = false,
}) => {
  const [content, setContent] = useState('')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() || isLoading) {
      return
    }

    await onSendMessage(content)
    setContent('')

    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleFileSelect = (file: any) => {
    // Append file link to content
    const fileLink = file.webViewLink || '#'
    const newContent = content ? `${content}\n${file.name}: ${fileLink}` : `${file.name}: ${fileLink}`
    setContent(newContent)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-4 bg-white"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
            title="Attach from Drive"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Ctrl+Enter to send)"
            className="flex-1 p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!content.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>

      <FilePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onFileSelect={handleFileSelect}
      />
    </>
  )
}