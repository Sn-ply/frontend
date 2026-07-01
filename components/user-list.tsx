'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { relationsApi, usersApi, type PublicProfile } from '@/lib/api'

interface UserListProps {
  userId: string
  mode: 'followers' | 'following'
}

export function UserList({ userId, mode }: UserListProps) {
  const { data: ids, status: idsStatus } = useQuery({
    queryKey: [mode, userId],
    queryFn: () => (mode === 'followers' ? relationsApi.followers(userId) : relationsApi.following(userId)),
    select: (res) => res.data.data,
  })

  const { data: profiles, status: profilesStatus } = useQuery({
    queryKey: [mode, userId, 'profiles', ids],
    queryFn: () => usersApi.batch(ids!),
    // usersApi.batch doesn't preserve input order, so re-sort to match the follower/following list
    select: (res) => {
      const byId = new Map(res.data.map((u) => [u.id, u]))
      return (ids ?? []).map((id) => byId.get(id)).filter((u): u is PublicProfile => !!u)
    },
    enabled: !!ids && ids.length > 0,
  })

  if (idsStatus === 'pending') {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (ids && ids.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400">
        {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
      </p>
    )
  }

  if (profilesStatus === 'pending') {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  const list: PublicProfile[] = profiles ?? []

  return (
    <div className="divide-y divide-zinc-100">
      {list.map((u) => (
        <Link
          key={u.id}
          href={`/profile/${u.username}`}
          className="flex items-center gap-3 py-3 hover:bg-zinc-50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-xs font-medium uppercase">
            {u.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- may be a local base64 data URL
              <img src={u.avatar_url} alt={u.username} className="h-full w-full object-cover" />
            ) : (
              u.username[0]
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{u.username}</p>
            {u.bio && <p className="text-xs text-zinc-500">{u.bio}</p>}
          </div>
        </Link>
      ))}
    </div>
  )
}
