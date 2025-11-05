'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, FileText, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamChatMessage, getChatMessages } from '@/lib/api'
import FileUpload from '@/components/files/FileUpload'
import FileList from '@/components/files/FileList'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  chatId: string
  userId: string
  selectedFiles: string[]
  onFileSelect: (fileId: string) => void
  onFileUploaded?: (fileId: string) => void  // Callback when file is uploaded
}

export default function ChatInterface({ chatId, userId, selectedFiles, onFileSelect, onFileUploaded }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [fileListRefresh, setFileListRefresh] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Load messages when chat changes
    const loadMessages = async () => {
      try {
        const chatMessages = await getChatMessages(chatId)
        setMessages(chatMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        })))
      } catch (error) {
        console.error('Failed to load messages:', error)
        setMessages([]) // Only clear on error
      }
    }

    loadMessages()
  }, [chatId])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      let fullContent = ''
      for await (const chunk of streamChatMessage(chatId, input, userId, selectedFiles)) {
        fullContent += chunk
        setMessages(prev => {
          const updated = [...prev]
          const lastMessage = updated[updated.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content = fullContent
          }
          return updated
        })
      }
    } catch (error) {
      console.error('Streaming error:', error)
      setMessages(prev => {
        const updated = [...prev]
        const lastMessage = updated[updated.length - 1]
        if (lastMessage.role === 'assistant') {
          lastMessage.content = 'Sorry, there was an error processing your request.'
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#212121]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center text-gray-400 py-12">
            <div>
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-white">Start a conversation</p>
              <p className="text-sm">Ask questions about your legal documents</p>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                  message.role === 'user'
                    ? 'bg-[#2f2f2f] text-white'
                    : 'bg-transparent text-gray-100'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-invert 
                    prose-headings:text-white prose-headings:font-semibold
                    prose-p:text-gray-200 prose-p:leading-relaxed
                    prose-strong:text-white prose-strong:font-semibold
                    prose-ul:text-gray-200 prose-ol:text-gray-200
                    prose-li:text-gray-200 prose-li:my-1
                    prose-code:text-blue-400 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                    prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {isStreaming && (
          <div className="max-w-3xl mx-auto w-full px-4">
            <div className="flex gap-4">
              <div className="bg-transparent rounded-lg px-5 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4 bg-[#212121]">
        <div className="max-w-3xl mx-auto">
          {/* File Upload Panel */}
          {showFileUpload && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg">
              <div className="mb-3">
                <FileUpload 
                  userId={userId} 
                  chatId={chatId}  // ✅ Pass chatId to link files to this chat
                  onFileUploaded={(fileId) => {
                    // Auto-select the uploaded file
                    onFileSelect(fileId)
                    // Refresh file list
                    setFileListRefresh(prev => prev + 1)
                    // Notify parent component
                    onFileUploaded?.(fileId)
                    // Close upload panel after a delay
                    setTimeout(() => setShowFileUpload(false), 2000)
                  }} 
                />
              </div>
              <div className="mt-3">
                <FileList
                  userId={userId}
                  chatId={chatId}
                  selectedFiles={selectedFiles}
                  onFileSelect={onFileSelect}
                  refreshTrigger={fileListRefresh}
                />
              </div>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="mb-3 flex gap-2 flex-wrap">
              {selectedFiles.map((fileId) => (
                <div key={fileId} className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Document attached
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-end bg-[#2f2f2f] rounded-3xl px-4 py-3 shadow-lg">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex-shrink-0"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything..."
              className="flex-1 resize-none bg-transparent text-white text-sm placeholder:text-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-h-32"
              rows={1}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="p-2 rounded-full bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
