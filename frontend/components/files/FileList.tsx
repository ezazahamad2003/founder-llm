'use client'

import { useState, useEffect } from 'react'
import { File, CheckCircle, Clock, XCircle } from 'lucide-react'
import { getUserFiles } from '@/lib/api'

interface FileListProps {
  userId: string
  selectedFiles: string[]
  onFileSelect: (fileId: string) => void
  chatId?: string  // Optional: filter files by chat
  refreshTrigger?: number  // Trigger to refresh file list
}

export default function FileList({ userId, selectedFiles, onFileSelect, chatId, refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFiles()
  }, [userId, chatId, refreshTrigger])

  const loadFiles = async () => {
    try {
      setLoading(true)
      // Get files for the current chat if chatId is provided
      const userFiles = await getUserFiles(userId, chatId)
      setFiles(userFiles)
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="text-xs text-gray-500">Loading files...</div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <File className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs">No files yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => file.status === 'completed' && onFileSelect(file.id)}
          className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors ${
            file.status === 'completed'
              ? 'cursor-pointer hover:bg-gray-800'
              : 'opacity-50 cursor-not-allowed'
          } ${
            selectedFiles.includes(file.id) ? 'bg-gray-800 border border-blue-500' : 'border border-transparent'
          }`}
        >
          <div className="flex-shrink-0">{getStatusIcon(file.status)}</div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">{file.filename}</p>
            <p className="text-xs text-gray-500">
              {new Date(file.created_at).toLocaleDateString()}
            </p>
          </div>

          {selectedFiles.includes(file.id) && (
            <div className="flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
