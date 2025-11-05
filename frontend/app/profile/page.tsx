'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Upload, File, Trash2, Download, User, FileText } from 'lucide-react'
import Link from 'next/link'
import { supabase, getProfile, getUserFiles, deleteUserFile, type UserFile } from '@/lib/supabase'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [files, setFiles] = useState<UserFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/landing')
      return
    }

    if (user) {
      loadProfile()
      loadFiles()
    }
  }, [user, authLoading, router])

  async function loadProfile() {
    if (!user) return
    try {
      const profileData = await getProfile(user.id)
      setProfile(profileData)
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  async function loadFiles() {
    if (!user) return
    try {
      // Use backend endpoint instead of Supabase client
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/v1/users/${user.id}/files`)
      
      if (response.ok) {
        const data = await response.json()
        // Map backend file format to frontend format
        setFiles(data.files.map((f: any) => ({
          id: f.id,
          user_id: f.user_id,
          path: f.file_path,
          original_name: f.filename,
          mime_type: f.mime_type,
          size_bytes: f.file_size,
          created_at: f.created_at,
        })))
      } else {
        // Fallback to Supabase client if backend fails
        const userFiles = await getUserFiles(user.id)
        setFiles(userFiles)
      }
    } catch (err) {
      console.error('Error loading files:', err)
      // Try Supabase fallback
      try {
        const userFiles = await getUserFiles(user.id)
        setFiles(userFiles)
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr)
      }
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate user ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user.id)) {
      setError('Invalid user session. Please log out and log in again.')
      console.error('Invalid user ID format:', user.id)
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, DOCX, PNG, and JPG files are allowed')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      // Get signed upload URL from backend API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      
      console.log('Uploading file:', {
        filename: file.name,
        content_type: file.type,
        user_id: user.id,
        api_url: API_URL
      })
      
      const response = await fetch(`${API_URL}/v1/files/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          user_id: user.id,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Backend error response:', errorText)
        // Try to parse JSON error
        try {
          const errorJson = JSON.parse(errorText)
          throw new Error(errorJson.detail || errorText || 'Failed to get upload URL')
        } catch {
          throw new Error(errorText || 'Failed to get upload URL')
        }
      }

      const { upload_url, file_path, file_id, token } = await response.json()
      const signedUrl = upload_url
      const path = file_path

      console.log('Uploading to storage:', {
        url: signedUrl,
        hasToken: !!token
      })

      // Upload file to signed URL with authorization
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Authorization': `Bearer ${token}`,
          'x-upsert': 'true',
        },
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(`Failed to upload file: ${errorText}`)
      }

      // File is already registered in database via backend endpoint
      // Optionally ingest the file for text extraction
      try {
        const ingestResponse = await fetch(`${API_URL}/v1/files/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: file_id,
            user_id: user.id,
          }),
        })
        if (!ingestResponse.ok) {
          console.warn('File ingestion failed, but upload succeeded')
        }
      } catch (ingestError) {
        console.warn('File ingestion error:', ingestError)
      }

      // Reload files - use backend endpoint instead
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
        const filesResponse = await fetch(`${API_URL}/v1/users/${user.id}/files`)
        if (filesResponse.ok) {
          const filesData = await filesResponse.json()
          // Map backend file format to frontend format
          setFiles(filesData.files.map((f: any) => ({
            id: f.id,
            user_id: f.user_id,
            path: f.file_path,
            original_name: f.filename,
            mime_type: f.mime_type,
            size_bytes: f.file_size,
            created_at: f.created_at,
          })))
        } else {
          await loadFiles() // Fallback to original method
        }
      } catch (err) {
        await loadFiles() // Fallback to original method
      }
      
      // Reset input
      e.target.value = ''
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!user) return
    
    const confirmed = window.confirm('Are you sure you want to delete this file?')
    if (!confirmed) return

    try {
      // Use backend API for deletion (consistent with file loading)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const deleteUrl = `${API_URL}/v1/files/${fileId}`
      
      // Get auth token
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      
      console.log('Deleting file via backend:', {
        fileId,
        url: deleteUrl,
        userId: user.id,
        hasToken: !!token
      })
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id
        }),
        cache: 'no-cache',
      })

      console.log('Delete response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || errorData.error || 'Failed to delete file'
        console.error('Delete failed:', {
          status: response.status,
          message: errorMessage,
          data: errorData
        })
        throw new Error(errorMessage)
      }

      // Remove from state
      setFiles(prev => prev.filter(f => f.id !== fileId))
      
      // Show success message
      console.log('File deleted successfully')
    } catch (err: any) {
      console.error('Delete error:', err)
      alert(`Failed to delete file: ${err.message}`)
    }
  }

  async function handleDownloadFile(file: UserFile) {
    try {
      // Use backend endpoint to get signed download URL
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_URL}/v1/files/${file.id}`, {
        method: 'GET',
      })

      if (!response.ok) {
        // Fallback to direct Supabase storage access
        const { data, error } = await supabase.storage
          .from('legal-docs')
          .createSignedUrl(file.path, 60)

        if (error) throw error

        const link = document.createElement('a')
        link.href = data.signedUrl
        link.download = file.original_name
        link.click()
        return
      }

      // If backend provides signed URL, use it
      const fileData = await response.json()
      if (fileData.download_url) {
        const link = document.createElement('a')
        link.href = fileData.download_url
        link.download = file.original_name
        link.click()
      }
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download file')
    }
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return 'Unknown'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (authLoading) {
    return (
      <div className="h-screen bg-[#212121] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#212121]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#171717]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-white">Profile</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile Info */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{profile?.full_name || 'User'}</h2>
              <p className="text-gray-400">{user.email}</p>
              {profile?.role === 'admin' && (
                <span className="inline-block mt-1 px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700 text-sm">
            <div>
              <p className="text-gray-400">Member since</p>
              <p className="text-white">{profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-400">Terms Accepted</p>
              <p className="text-white">{profile?.terms_version ? `Version ${profile.terms_version}` : 'Not accepted'}</p>
            </div>
          </div>
        </div>

        {/* My Files Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">My Files</h2>
            </div>
            <span className="text-sm text-gray-400">{files.length} file{files.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-400">
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOCX, PNG, JPG (max 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.docx,.png,.jpg,.jpeg"
              />
            </label>

            {error && (
              <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Files List */}
          {files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.original_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size_bytes)} • {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No files uploaded yet</p>
              <p className="text-sm text-gray-500 mt-1">Upload your first file to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
