'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { usersApi } from '@/lib/api'
import { UserList } from '@/components/user-list'

export default function FollowingPage() {
  const { username } = useParams<{ username: string }>()

  const { data: profile, status } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.getProfile(username),
    select: (res) => res.data,
  })

  if (status === 'pending') {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (status === 'error' || !profile) {
    return <div className="py-20 text-center text-sm text-zinc-400">User not found.</div>
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-bold">{profile.username} is following</h1>
      <UserList userId={profile.id} mode="following" />
    </div>
  )
}
