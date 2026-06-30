'use client'

import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { postsApi, type Post } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { PostCard } from '@/components/post-card'

export default function FeedPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  // For now, seed with the current user's own posts in the feed
  const followedIds = user ? [user.id] : []

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ['feed', followedIds],
    queryFn: ({ pageParam }) => postsApi.getFeed(followedIds, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.next_cursor || undefined,
    enabled: isAuthenticated && followedIds.length > 0,
  })

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allPosts: Post[] = data?.pages.flatMap((p) => p.data.data) ?? []

  if (!isAuthenticated) return null

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h2 className="text-xl font-semibold">Your Feed</h2>

      {status === 'pending' && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}

      {status === 'success' && allPosts.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-200 p-12 text-center text-sm text-zinc-400">
          Nothing here yet. Create a post or follow some users!
        </div>
      )}

      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} username={user?.username} />
      ))}

      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      )}
    </div>
  )
}
