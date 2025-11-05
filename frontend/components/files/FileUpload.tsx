'use client'

import { useState } from 'react'
import { Upload, File, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getSignedUploadUrl, uploadFileToSignedUrl, ingestFile } from '@/lib/api'

interface FileUploadProps {
  userId: string
  chatId?: string  // ✅ Add chatId prop
  onFileUploaded?: (fileId: string) => void
}

export default function FileUpload({ userId, chatId, onFileUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    filename: string
    status: 'uploading' | 'processing' | 'success' | 'error'
    message?: string
  } | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus({
      filename: file.name,
      status: 'uploading',
    })

    try {
      // Get signed upload URL
      const { upload_url, file_id, token } = await getSignedUploadUrl(
        file.name,
        file.type,
        userId,
        chatId  // ✅ Pass chatId to link file to chat
      )

      // Upload file
      await uploadFileToSignedUrl(upload_url, file, token)

      setUploadStatus({
        filename: file.name,
        status: 'processing',
        message: 'Waiting for upload to complete...',
      })

      // Wait 2 seconds for upload to fully complete in Supabase
      await new Promise(resolve => setTimeout(resolve, 2000))

      setUploadStatus({
        filename: file.name,
        status: 'processing',
        message: 'Extracting text with OpenAI...',
      })

      // Ingest file (extract text)
      await ingestFile(file_id, userId)

      setUploadStatus({
        filename: file.name,
        status: 'success',
        message: 'File processed successfully',
      })

      onFileUploaded?.(file_id)

      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(null), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({
        filename: file.name,
        status: 'error',
        message: 'Failed to process file',
      })
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor="file-upload"
        className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-gray-800/30 hover:bg-gray-800/50 transition-colors ${
          uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-6 h-6 mb-2 text-gray-400" />
          <p className="mb-1 text-xs text-gray-400">
            <span className="font-semibold">Click to upload</span>
          </p>
          <p className="text-xs text-gray-500">PDF, DOC, DOCX</p>
        </div>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </label>

      {uploadStatus && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          {uploadStatus.status === 'uploading' && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          )}
          {uploadStatus.status === 'processing' && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          )}
          {uploadStatus.status === 'success' && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {uploadStatus.status === 'error' && (
            <XCircle className="w-4 h-4 text-red-500" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <File className="w-3 h-3 text-gray-400" />
              <p className="text-xs font-medium text-gray-200 truncate">{uploadStatus.filename}</p>
            </div>
            {uploadStatus.message && (
              <p className="text-xs text-gray-400 mt-1">
                {uploadStatus.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
