'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Plus, Menu, LogOut, Trash2, User } from 'lucide-react'
import ChatInterface from '@/components/chat/ChatInterface'
import { createChat, getUserChats, deleteChat as apiDeleteChat } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function ChatPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    // Redirect to landing if not authenticated
    if (!authLoading && !user) {
      router.push('/landing')
      return
    }
    
    if (user) {
      loadChats()
    }
  }, [user, authLoading, router])

  // Auto-select files linked to the current chat
  useEffect(() => {
    if (currentChatId && user) {
      loadChatFiles(currentChatId)
    } else {
      setSelectedFiles([])
    }
  }, [currentChatId, user])

  const loadChatFiles = async (chatId: string) => {
    if (!user) return
    try {
      const { getUserFiles } = await import('@/lib/api')
      const files = await getUserFiles(user.id, chatId)
      // Auto-select completed files linked to this chat
      const completedFileIds = files
        .filter(file => file.status === 'completed')
        .map(file => file.id)
      setSelectedFiles(completedFileIds)
    } catch (error) {
      console.error('Failed to load chat files:', error)
    }
  }

  const loadChats = async () => {
    if (!user) return
    
    try {
      const userChats = await getUserChats(user.id)
      setChats(userChats)
      // Auto-select first chat on load
      if (userChats.length > 0) {
        setCurrentChatId(userChats[0].id)
      }
    } catch (error) {
      console.error('Failed to load chats:', error)
    }
  }

  const handleNewChat = async () => {
    if (!user) return
    
    try {
      const newChat = await createChat(user.id, 'New Legal Chat')
      setChats(prev => [newChat, ...prev])
      setCurrentChatId(newChat.id)
      setSelectedFiles([])
    } catch (error) {
      console.error('Failed to create chat:', error)
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    if (!user) return
    const confirmed = window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')
    if (!confirmed) return
    try {
      await apiDeleteChat(chatId, user.id)
      setChats(prev => prev.filter(c => c.id !== chatId))
      if (currentChatId === chatId) {
        const remaining = chats.filter(c => c.id !== chatId)
        setCurrentChatId(remaining.length > 0 ? remaining[0].id : null)
        setSelectedFiles([])
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      alert('Failed to delete chat. Please try again.')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/landing')
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="h-screen bg-[#212121] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  return (
    <div className="flex h-screen bg-[#212121]">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 bg-[#171717] border-r border-gray-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-white">Scopic Legal</h1>
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  title="Profile"
                >
                  <User className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>

          {/* Chats */}
          <div className="flex-1 overflow-y-auto p-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 p-3 mb-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">New chat</span>
            </button>

            <div className="space-y-1 mt-4">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-gray-800'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <button
                    onClick={() => setCurrentChatId(chat.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                    title="Open chat"
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span className="text-sm text-gray-200 truncate">{chat.title}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteChat(chat.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-opacity"
                    title="Delete chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Bar with Toggle and Profile */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <Link
            href="/profile"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
            title="Profile"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>

        {currentChatId ? (
          <ChatInterface
            chatId={currentChatId}
            userId={user.id}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
            onFileUploaded={async (fileId) => {
              // Reload files for this chat after upload
              await loadChatFiles(currentChatId)
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl px-4">
              <h1 className="text-4xl font-semibold text-white mb-4">What are you working on?</h1>
              <p className="text-gray-400 mb-8">Upload legal documents and ask questions</p>
              <button
                onClick={handleNewChat}
                className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
