'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Home, PlusSquare, Search, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import { Button } from './ui/button'

export function Nav() {
  const { user, isAuthenticated, logout, refreshToken } = useAuthStore()
  const router = useRouter()

  async function handleLogout() {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {})
    }
    logout()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2 font-bold text-lg">
          <Camera className="h-5 w-5" />
          Snaply
        </Link>

        {/* Search (placeholder) */}
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 w-56">
          <Search className="h-4 w-4" />
          <span>Search…</span>
        </div>

        {/* Actions */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/feed">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/create-post">
                <PlusSquare className="h-5 w-5" />
              </Link>
            </Button>
            {user && (
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/profile/${user.username}`}>
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Sign up</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
