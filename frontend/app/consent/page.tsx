'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, CheckCircle2, ExternalLink, FileText } from 'lucide-react'
import Link from 'next/link'
import { acceptTerms } from '@/lib/supabase'

const TERMS_VERSION = 'v1'

const DOCUMENTS = [
  {
    name: 'Terms of Use',
    file: 'Terms of Use for Design Partner Program.docx',
    description: 'Legal terms and conditions for using Scopic Legal'
  },
  {
    name: 'Privacy Policy',
    file: 'Privacy Policy for Design Partner Program.docx',
    description: 'How we collect, use, and protect your data'
  },
  {
    name: 'Design Partner Agreement',
    file: 'Acceptance for Design Partner Program.docx',
    description: 'Agreement for participating in our design partner program'
  }
]

export default function ConsentPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [viewedDocs, setViewedDocs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }
  }, [user, router])

  const handleDocumentClick = (docName: string) => {
    setViewedDocs(prev => new Set(prev).add(docName))
  }

  async function handleAccept() {
    if (!user || !agreed) return

    setSubmitting(true)
    setError('')

    try {
      console.log('Accepting terms for user:', user.id)
      await acceptTerms(user.id, TERMS_VERSION)
      console.log('Terms accepted successfully')
      // Redirect to main chat
      router.push('/chat')
    } catch (err: any) {
      console.error('Error accepting terms:', err)
      const errorMessage = err?.message || err?.toString() || 'Unknown error'
      setError(`Failed to save acceptance: ${errorMessage}. Please try again.`)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#212121]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#171717]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Scopic Legal</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Scopic Legal</h2>
          <p className="text-gray-400">
            Before you begin, please review and accept the following documents to continue.
          </p>
        </div>

        {/* Documents List */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Required Documents</h3>
          <div className="space-y-3">
            {DOCUMENTS.map((doc, index) => (
              <a
                key={index}
                href={`/terms/${encodeURIComponent(doc.file)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDocumentClick(doc.name)}
                className="flex items-start gap-3 p-4 rounded-lg bg-[#212121] hover:bg-gray-700 border border-gray-700 hover:border-blue-500 transition-all group"
              >
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {doc.name}
                    </h4>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{doc.description}</p>
                  {viewedDocs.has(doc.name) && (
                    <span className="inline-block mt-2 text-xs text-green-400">
                      ✓ Viewed
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>Important:</strong> Please click and review each document above before accepting.
            </p>
          </div>
        </div>

        {/* Acceptance */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className="text-gray-300">
              I have read and agree to the{' '}
              <strong className="text-white">Terms of Use</strong>,{' '}
              <strong className="text-white">Privacy Policy</strong>, and{' '}
              <strong className="text-white">Design Partner Agreement</strong>
            </span>
          </label>

          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleAccept}
              disabled={!agreed || submitting}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Accept and Continue
                </>
              )}
            </button>
            <Link
              href="/auth"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
