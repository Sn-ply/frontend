'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { conversationsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function MessagesPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const { data, status } = useInfiniteQuery({
    queryKey: ['conversations'],
    queryFn: ({ pageParam }) => conversationsApi.list(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.next_cursor || undefined,
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) return null

  const conversations = data?.pages.flatMap((p) => p.data.data) ?? []

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="mb-4 text-xl font-semibold">Messages</h2>

      {status === 'pending' && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}

      {status === 'success' && conversations.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-200 p-12 text-center text-sm text-zinc-400">
          No conversations yet.
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {conversations.map((c) => (
          <Link
            key={c.conversation.id}
            href={`/messages/${c.conversation.id}?participantId=${c.other_participant_id}&username=${encodeURIComponent(c.other_username)}`}
            className="flex items-center justify-between gap-3 px-2 py-3 hover:bg-zinc-50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{c.other_username || 'Unknown user'}</p>
              <p className="truncate text-sm text-zinc-500">{c.last_message_preview || 'No messages yet'}</p>
            </div>
            {c.unread_count > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
          </Link>
        ))}
      </div>
    </div>
  )
}
