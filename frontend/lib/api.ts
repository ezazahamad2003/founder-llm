const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface Chat {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  chat_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export interface FileUpload {
  id: string
  filename: string
  file_path: string
  status: string
  created_at: string
}

// Create a new chat
export async function createChat(userId: string, title?: string): Promise<Chat> {
  const response = await fetch(`${API_URL}/v1/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, title: title || 'New Chat' }),
  })
  
  if (!response.ok) throw new Error('Failed to create chat')
  return response.json()
}

// Get chat messages
export async function getChatMessages(chatId: string): Promise<Message[]> {
  const response = await fetch(`${API_URL}/v1/chats/${chatId}/messages`)
  if (!response.ok) throw new Error('Failed to fetch messages')
  const data = await response.json()
  return data.messages
}

// Send message with SSE streaming
export async function* streamChatMessage(
  chatId: string,
  message: string,
  userId: string,
  fileIds: string[] = []
): AsyncGenerator<string> {
  const response = await fetch(`${API_URL}/v1/chats/${chatId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      user_id: userId,
      file_ids: fileIds,
      stream: true,
    }),
  })

  if (!response.ok) throw new Error('Failed to send message')

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) throw new Error('No response body')

  try {
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim()
          
          // Check for completion signal
          if (data === '[DONE]') {
            return
          }
          
          // Skip empty data
          if (!data) continue
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              yield parsed.content
            }
            if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e) {
            // Silently skip parse errors for incomplete chunks
            // They will be completed in the next iteration
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// Get signed upload URL
export async function getSignedUploadUrl(
  filename: string,
  contentType: string,
  userId: string,
  chatId?: string  // ✅ Add chat_id parameter
): Promise<{ upload_url: string; file_id: string; file_path: string; token?: string }> {
  const response = await fetch(`${API_URL}/v1/files/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename,
      content_type: contentType,
      user_id: userId,
      chat_id: chatId,  // ✅ Include chat_id in request
    }),
  })

  if (!response.ok) throw new Error('Failed to get upload URL')
  return response.json()
}

// Upload file to signed URL
export async function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': file.type,
    'x-upsert': 'true',
  }
  
  // Add authorization headers if token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    headers['apikey'] = token
  }
  
  const response = await fetch(signedUrl, {
    method: 'PUT',  // Use PUT for Supabase Storage API
    body: file,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Upload failed:', errorText)
    console.error('Response status:', response.status)
    console.error('Response statusText:', response.statusText)
    throw new Error(`Failed to upload file: ${response.status} ${response.statusText} - ${errorText}`)
  }
}

// Ingest file (extract text)
export async function ingestFile(
  fileId: string,
  userId: string
): Promise<{ file_id: string; status: string; message: string }> {
  const response = await fetch(`${API_URL}/v1/files/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      user_id: userId,
    }),
  })

  if (!response.ok) throw new Error('Failed to ingest file')
  return response.json()
}

// Get user's chats
export async function getUserChats(userId: string): Promise<Chat[]> {
  const response = await fetch(`${API_URL}/v1/users/${userId}/chats`)
  if (!response.ok) throw new Error('Failed to fetch chats')
  const data = await response.json()
  return data.chats
}

// Get user's files
export async function getUserFiles(userId: string, chatId?: string): Promise<FileUpload[]> {
  const url = new URL(`${API_URL}/v1/users/${userId}/files`)
  if (chatId) {
    url.searchParams.append('chat_id', chatId)
  }
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error('Failed to fetch files')
  const data = await response.json()
  return data.files
}

// Delete a chat (requires X-User-Id header)
export async function deleteChat(chatId: string, userId: string): Promise<{ status: string; chat_id: string }> {
  const response = await fetch(`${API_URL}/v1/chats/${chatId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(err || 'Failed to delete chat')
  }
  return response.json()
}
