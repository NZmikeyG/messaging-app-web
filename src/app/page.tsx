import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 px-4">
      <div className="text-center max-w-2xl">
        {/* Logo/Branding */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
            <span className="text-2xl font-bold text-white">💬</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Messaging App
          </h1>
          <p className="text-xl text-gray-600">
            A modern team collaboration platform with real-time messaging, calendars, and more.
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-12">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <span className="text-2xl mb-2 block">💬</span>
            <p className="text-sm font-medium text-gray-700">Real-time Chat</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <span className="text-2xl mb-2 block">📅</span>
            <p className="text-sm font-medium text-gray-700">Calendar Sync</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <span className="text-2xl mb-2 block">👥</span>
            <p className="text-sm font-medium text-gray-700">Team Collab</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Create Account
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 text-sm text-gray-600">
          <p>
            Built with{' '}
            <span className="text-blue-600 font-semibold">Next.js</span> &{' '}
            <span className="text-green-600 font-semibold">Supabase</span>
          </p>
        </div>
      </div>
    </div>
  )
}
