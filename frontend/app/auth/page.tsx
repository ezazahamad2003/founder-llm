'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { supabase, getProfile } from '@/lib/supabase'

function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  
  const { user, signIn, signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if mode is set in URL
    const urlMode = searchParams.get('mode')
    if (urlMode === 'signup') {
      setMode('signup')
    }

    // Redirect if already logged in
    if (user) {
      checkUserFlow()
    }
  }, [user, searchParams])

  async function checkUserFlow() {
    if (!user) return

    // Check if user has accepted terms
    const profile = await getProfile(user.id)
    
    if (!profile?.terms_version) {
      // First time user - redirect to consent
      router.push('/consent')
    } else {
      // Existing user - go to chat
      router.push('/chat')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        await signUp(email, password, fullName)
        // Show email confirmation message (Supabase sends magic link)
        setShowEmailConfirmation(true)
      } else {
        await signIn(email, password)
        // After login, check if terms accepted
        await checkUserFlow()
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#212121] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Scopic Legal</h1>
          </Link>
          <h2 className="text-xl text-gray-300">
            {showEmailConfirmation ? 'Check Your Email' : mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
        </div>

        {/* Email Confirmation Message */}
        {showEmailConfirmation ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Verify Your Email</h3>
              <p className="text-gray-400 mb-4">
                We've sent a confirmation link to:
              </p>
              <p className="text-blue-400 font-medium mb-6">{email}</p>
              <p className="text-sm text-gray-400">
                Click the link in your email to verify your account and continue to Scopic Legal.
                The link will expire in 24 hours.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">
                  <strong className="text-gray-300">Note:</strong> Check your spam folder if you don't see the email.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowEmailConfirmation(false)
                  setMode('login')
                }}
                className="w-full px-4 py-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center text-sm text-gray-400">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#212121] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
