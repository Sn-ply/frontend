'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Camera, Home, PlusSquare, Search, LogOut, User, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { authApi, usersApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

export function Nav() {
  const { user, isAuthenticated, logout, refreshToken } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // isAuthenticated resolves from localStorage the instant this module loads client-side,
  // before the first hydration pass — always false during SSR. Gate on mount so the first
  // client render matches the server-rendered (logged-out) markup, avoiding a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const showAuthedUI = mounted && isAuthenticated

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: results, isFetching } = useQuery({
    queryKey: ['userSearch', debouncedQuery],
    queryFn: () => usersApi.search(debouncedQuery),
    select: (res) => res.data.data,
    enabled: debouncedQuery.length > 0,
  })

  function goToProfile(username: string) {
    setQuery('')
    setIsSearchOpen(false)
    router.push(`/profile/${username}`)
  }

  async function handleLogout() {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {})
    }
    logout()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2 font-bold text-lg">
          <Camera className="h-5 w-5 text-primary" />
          Snaply
        </Link>

        {/* Search */}
        {showAuthedUI && (
          <div ref={searchRef} className="relative hidden sm:block w-56">
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus-within:border-primary/40">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </div>

            {isSearchOpen && debouncedQuery && (
              <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-md">
                {isFetching ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  </div>
                ) : results && results.length > 0 ? (
                  results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => goToProfile(r.username)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-xs font-medium uppercase">
                        {r.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- may be a local base64 data URL
                          <img src={r.avatar_url} alt={r.username} className="h-full w-full object-cover" />
                        ) : (
                          r.username[0]
                        )}
                      </div>
                      {r.username}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-zinc-400">No users found</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showAuthedUI ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/feed">
                <Home className={cn('h-5 w-5', pathname === '/feed' && 'text-primary')} />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/create-post">
                <PlusSquare className={cn('h-5 w-5', pathname === '/create-post' && 'text-primary')} />
              </Link>
            </Button>
            {user && (
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/profile/${user.username}`}>
                  <User className={cn('h-5 w-5', pathname === `/profile/${user.username}` && 'text-primary')} />
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
