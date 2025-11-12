import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Messaging App</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Your Dashboard! 🎉
            </h2>
            <p className="text-gray-600">
              You've successfully authenticated with Supabase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                User Information
              </h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-blue-800">Email:</dt>
                  <dd className="text-sm text-blue-700">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-blue-800">User ID:</dt>
                  <dd className="text-sm text-blue-700 font-mono truncate">
                    {user.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-blue-800">
                    Last Login:
                  </dt>
                  <dd className="text-sm text-blue-700">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Next Steps
              </h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li>✅ Authentication working</li>
                <li>⏳ Build messaging features</li>
                <li>⏳ Implement calendar system</li>
                <li>⏳ Add file uploads</li>
                <li>⏳ Create team management</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
