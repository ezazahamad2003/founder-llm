'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MessageSquare, FileText, Eye, LogOut } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const ADMIN_KEY = '0123456' // From backend .env ADMIN_TOKEN

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
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword === ADMIN_KEY) {
      setIsAuthenticated(true)
      loadUsers()
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
      setUsers(data.users)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load users:', error)
      setLoading(false)
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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Calix Admin Dashboard</h1>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Back to App
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="bg-[#2f2f2f] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users ({users.length})
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => loadUserDetails(user)}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-gray-700'
                      : 'bg-[#212121] hover:bg-gray-800'
                  }`}
                >
                  <div className="font-medium">{user.email}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {user.chat_count} chats · {user.file_count} files
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </button>
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
                          className={`p-3 bg-[#212121] rounded-lg ${
                            file.chat_id && linkedChat
                              ? 'cursor-pointer hover:bg-gray-800 border border-gray-700'
                              : ''
                          }`}
                          onClick={() => {
                            if (file.chat_id && linkedChat) {
                              loadChatMessages(linkedChat)
                            }
                          }}
                        >
                          <div className="font-medium text-sm">{file.filename}</div>
                          <div className="text-xs text-gray-400 mt-1">
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
                          {file.chat_id && linkedChat && (
                            <div className="text-xs text-blue-400 mt-1">
                              Click to view chat
                            </div>
                          )}
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
      </div>
    </div>
  )
}
