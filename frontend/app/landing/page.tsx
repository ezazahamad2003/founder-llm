'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, Shield, Zap, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect to chat if already logged in
    if (user) {
      router.push('/chat')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#171717] via-[#212121] to-[#171717]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Scopic Legal</h1>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin"
                className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
              >
                Lawyer Login
              </Link>
              <Link
                href="/auth"
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/auth?mode=signup"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            AI-Powered Legal Assistant
            <br />
            <span className="text-blue-400">for Startup Founders</span>
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Get instant legal guidance powered by GPT-5. Upload documents, ask questions, 
            and receive clear answers tailored to your startup's needs.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth?mode=signup"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-lg flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Instant Answers</h3>
            <p className="text-gray-400">
              Get immediate responses to legal questions powered by GPT-5. No waiting, no scheduling.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Document Analysis</h3>
            <p className="text-gray-400">
              Upload contracts, agreements, and legal documents for AI-powered analysis and insights.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Secure & Private</h3>
            <p className="text-gray-400">
              Your data is encrypted and secure. We never share your information or documents.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500">
            <strong>Disclaimer:</strong> Scopic Legal provides AI-generated information for educational purposes only. 
            This is not legal advice. Always consult with a licensed attorney for specific legal matters.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>© 2025 Scopic Legal. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/terms/Terms of Use for Design Partner Program.docx" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Terms of Use</a>
              <a href="/terms/Privacy Policy for Design Partner Program.docx" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
