'use client'

import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { likesApi, postsApi, relationsApi, usersApi, type Post } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { PostCard } from '@/components/post-card'

export default function FeedPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const { data: followingIds, status: followingStatus } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => relationsApi.following(user!.id),
    select: (res) => res.data.data,
    enabled: !!user?.id,
  })

  // Feed always includes your own posts, plus everyone you follow
  const followedIds = user ? [user.id, ...(followingIds ?? [])] : []

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ['feed', followedIds],
    queryFn: ({ pageParam }) => postsApi.getFeed(followedIds, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.next_cursor || undefined,
    enabled: isAuthenticated && followingStatus !== 'pending' && followedIds.length > 0,
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
  const authorIds = Array.from(new Set(allPosts.map((p) => p.user_id)))

  const { data: authorsByID } = useQuery({
    queryKey: ['postAuthors', authorIds],
    queryFn: () => usersApi.batch(authorIds),
    select: (res) => new Map(res.data.map((u) => [u.id, u.username])),
    enabled: authorIds.length > 0,
  })

  const postIds = allPosts.map((p) => p.id)

  const { data: likesByID } = useQuery({
    queryKey: ['likes', 'batch', postIds],
    queryFn: () => likesApi.batch(postIds),
    select: (res) => new Map(res.data.map((l) => [l.post_id, { count: l.count, liked: l.liked }])),
    enabled: postIds.length > 0,
  })

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
        <PostCard
          key={post.id}
          post={post}
          username={authorsByID?.get(post.user_id)}
          initialLikeCount={likesByID?.get(post.id)?.count ?? 0}
          initialLiked={likesByID?.get(post.id)?.liked ?? false}
        />
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
