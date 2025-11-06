'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MessageSquare, FileText, Eye, LogOut, Trash2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const ADMIN_KEY = 'scopic-admin-2025-secure-token-xyz789' // From backend .env ADMIN_TOKEN

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  chat_count: number
  file_count: number
}

interface Chat {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface File {
  id: string
  user_id: string
  filename: string
  status: string
  created_at: string
  chat_id?: string  // ✅ Files can be linked to chats
}

interface Message {
  id: string
  role: string
  content: string
  created_at: string
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userChats, setUserChats] = useState<Chat[]>([])
  const [userFiles, setUserFiles] = useState<File[]>([])
  const [allFiles, setAllFiles] = useState<File[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [viewMode, setViewMode] = useState<'users' | 'files'>('users')
  const router = useRouter()

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword === ADMIN_KEY) {
      setIsAuthenticated(true)
      loadUsers()
      loadAllFiles()
    } else {
      alert('Invalid admin password')
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/v1/admin/users`, {
        headers: { 'X-Admin-Key': ADMIN_KEY }
      })
      const data = await response.json()
      setUsers(data.users || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load users:', error)
      setLoading(false)
    }
  }

  const loadAllFiles = async () => {
    try {
      console.log('Loading all files from:', `${API_URL}/v1/admin/files`)
      const response = await fetch(`${API_URL}/v1/admin/files`, {
        headers: { 'X-Admin-Key': ADMIN_KEY }
      })
      
      if (!response.ok) {
        console.error('Failed to fetch files:', response.status, response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('All files loaded:', data.files?.length || 0, 'files')
      setAllFiles(data.files || [])
    } catch (error) {
      console.error('Failed to load all files:', error)
    }
  }

  const handleDownloadFile = async (file: File) => {
    try {
      // Get download URL from backend
      const response = await fetch(`${API_URL}/v1/files/${file.id}`, {
        headers: { 'X-Admin-Key': ADMIN_KEY }
      })
      
      if (!response.ok) {
        throw new Error('Failed to get file download URL')
      }
      
      const fileData = await response.json()
      
      // Create download link
      const link = document.createElement('a')
      link.href = fileData.download_url || `${API_URL}/v1/files/${file.id}/download`
      link.download = file.filename
      link.click()
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download file')
    }
  }

  const handleViewFile = async (file: File) => {
    try {
      console.log('Viewing file:', file.id, file.filename)
      
      // Get download URL from backend
      const response = await fetch(`${API_URL}/v1/files/${file.id}`, {
        headers: { 'X-Admin-Key': ADMIN_KEY }
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Failed to get file URL: ${response.status} - ${errorText}`)
      }
      
      const fileData = await response.json()
      console.log('File data:', fileData)
      
      const viewUrl = fileData.download_url
      
      if (!viewUrl) {
        throw new Error('No download URL in response')
      }
      
      console.log('Opening URL:', viewUrl)
      
      // Open in new tab
      window.open(viewUrl, '_blank')
    } catch (error: any) {
      console.error('View error:', error)
      alert(`Failed to view file: ${error.message}`)
    }
  }

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${user.email}"?\n\n` +
      `This will permanently delete:\n` +
      `- ${user.chat_count} chats\n` +
      `- ${user.file_count} files\n` +
      `- All associated data\n\n` +
      `This action cannot be undone!`
    )
    
    if (!confirmed) return
    
    try {
      console.log('Deleting user:', user.id)
      
      const response = await fetch(`${API_URL}/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': ADMIN_KEY }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete user: ${errorText}`)
      }
      
      // Remove from UI
      setUsers(prev => prev.filter(u => u.id !== user.id))
      
      // Clear selection if deleted user was selected
      if (selectedUser?.id === user.id) {
        setSelectedUser(null)
        setUserChats([])
        setUserFiles([])
      }
      
      alert('User deleted successfully')
    } catch (error: any) {
      console.error('Delete user error:', error)
      alert(`Failed to delete user: ${error.message}`)
    }
  }

  const loadUserDetails = async (user: User) => {
    setSelectedUser(user)
    setSelectedChat(null)
    setChatMessages([])
    
    try {
      // Load user's chats
      const chatsRes = await fetch(`${API_URL}/v1/admin/users/${user.id}/chats`, {
        headers: { 'X-Admin-Key': ADMIN_KEY }
      })
      const chatsData = await chatsRes.json()
      setUserChats(chatsData.chats)

      // Load user's files
      const filesRes = await fetch(`${API_URL}/v1/admin/users/${user.id}/files`, {
        headers: { 'X-Admin-Key': ADMIN_KEY }
      })
      const filesData = await filesRes.json()
      setUserFiles(filesData.files)
    } catch (error) {
      console.error('Failed to load user details:', error)
    }
  }

  const loadChatMessages = async (chat: Chat) => {
    setSelectedChat(chat)
    
    try {
      const response = await fetch(`${API_URL}/v1/admin/chats/${chat.id}/messages`, {
        headers: { 'X-Admin-Key': ADMIN_KEY }
      })
      const data = await response.json()
      setChatMessages(data.messages)
      
      // Reload files to show files filtered by selected chat
      if (selectedUser) {
        const filesRes = await fetch(`${API_URL}/v1/admin/users/${selectedUser.id}/files`, {
          headers: { 'X-Admin-Key': ADMIN_KEY }
        })
        const filesData = await filesRes.json()
        setUserFiles(filesData.files)
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#212121] flex items-center justify-center">
        <div className="bg-[#2f2f2f] p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6">Admin Login</h1>
          <form onSubmit={handleAdminLogin}>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 bg-[#212121] text-white rounded-lg border border-gray-700 focus:border-gray-500 focus:outline-none mb-4"
            />
            <button
              type="submit"
              className="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      {/* Header */}
      <div className="bg-[#2f2f2f] border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Calix Admin Dashboard</h1>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Back to App
            </button>
          </div>
          
          {/* View Mode Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('users')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'users'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Users View
            </button>
            <button
              onClick={() => setViewMode('files')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'files'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              All Files ({allFiles.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {viewMode === 'files' ? (
          /* All Files View */
          <div className="bg-[#2f2f2f] rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              All Files ({allFiles.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allFiles.map((file) => {
                const fileUser = users.find(u => u.id === file.user_id)
                return (
                  <div
                    key={file.id}
                    className="p-4 bg-[#212121] rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <span className={`text-xs px-2 py-1 rounded ${
                        file.status === 'completed' 
                          ? 'bg-green-900/30 text-green-400'
                          : file.status === 'processing'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : file.status === 'failed'
                          ? 'bg-red-900/30 text-red-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {file.status}
                      </span>
                    </div>
                    
                    <div className="font-medium text-sm mb-2 break-words">
                      {file.filename}
                    </div>
                    
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>
                        User: {fileUser?.email || 'Unknown'}
                      </div>
                      <div>
                        {file.chat_id ? (
                          <span className="text-blue-400">
                            • Linked to chat
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            • Not linked to any chat
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500">
                        {new Date(file.created_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleViewFile(file)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                      </div>
                      {fileUser && (
                        <button
                          onClick={() => {
                            setViewMode('users')
                            loadUserDetails(fileUser)
                          }}
                          className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                        >
                          View User
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {allFiles.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  No files uploaded yet
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Users View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="bg-[#2f2f2f] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users ({users?.length || 0})
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users?.map((user) => (
                <div
                  key={user.id}
                  className={`relative p-4 rounded-lg transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-gray-700'
                      : 'bg-[#212121] hover:bg-gray-800'
                  }`}
                >
                  <button
                    onClick={() => loadUserDetails(user)}
                    className="w-full text-left"
                  >
                    <div className="font-medium pr-8">{user.email}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {user.chat_count} chats · {user.file_count} files
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteUser(user)
                    }}
                    className="absolute top-3 right-3 p-2 rounded-lg hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User Details */}
          {selectedUser && (
            <div className="bg-[#2f2f2f] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {selectedUser.email}
              </h2>
              
              {/* Chats */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chats ({userChats.length})
                </h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {userChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => loadChatMessages(chat)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedChat?.id === chat.id
                          ? 'bg-gray-700'
                          : 'bg-[#212121] hover:bg-gray-800'
                      }`}
                    >
                      <div className="font-medium text-sm">{chat.title}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(chat.updated_at).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Files */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {selectedChat 
                    ? `Files for ${selectedChat.title} (${userFiles.filter(f => f.chat_id === selectedChat.id).length})`
                    : `All Files (${userFiles.length})`
                  }
                </h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {userFiles
                    .filter(file => !selectedChat || file.chat_id === selectedChat.id)
                    .map((file) => {
                      const linkedChat = file.chat_id 
                        ? userChats.find(chat => chat.id === file.chat_id)
                        : null
                      
                      return (
                        <div
                          key={file.id}
                          className="p-3 bg-[#212121] rounded-lg border border-gray-700"
                        >
                          <div className="font-medium text-sm mb-2">{file.filename}</div>
                          <div className="text-xs text-gray-400 mb-2">
                            Status: {file.status}
                            {file.chat_id && linkedChat ? (
                              <span className="ml-2 text-blue-400">
                                • Linked to: {linkedChat.title}
                              </span>
                            ) : file.chat_id ? (
                              <span className="ml-2 text-gray-500">
                                • Linked to chat (ID: {file.chat_id.substring(0, 8)}...)
                              </span>
                            ) : (
                              <span className="ml-2 text-gray-500">
                                • Not linked to any chat
                              </span>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewFile(file)
                              }}
                              className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadFile(file)
                              }}
                              className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </button>
                            {file.chat_id && linkedChat && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  loadChatMessages(linkedChat)
                                }}
                                className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                              >
                                View Chat
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {selectedChat && (
            <div className="bg-[#2f2f2f] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {selectedChat.title}
              </h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-900/30 ml-4'
                        : 'bg-[#212121] mr-4'
                    }`}
                  >
                    <div className="text-xs text-gray-400 mb-2">
                      {message.role === 'user' ? 'User' : 'Assistant'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  )
}
