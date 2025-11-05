'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Authenticated user -> go to chat
        router.push('/chat')
      } else {
        // Not authenticated -> go to landing
        router.push('/landing')
      }
    }
  }, [user, loading, router])

  // Show loading while determining redirect
  return (
    <div className="h-screen bg-[#212121] flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  )
}
