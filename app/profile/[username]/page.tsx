'use client'

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Loader2, Grid3x3, MessageCircle } from 'lucide-react'
import { conversationsApi, likesApi, postsApi, relationsApi, usersApi, type Post } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data: profile, status: profileStatus } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.getProfile(username),
    select: (res) => res.data,
  })

  const isOwnProfile = currentUser?.username === profile?.username

  const { data: counts } = useQuery({
    queryKey: ['followCounts', profile?.id],
    queryFn: () => relationsApi.counts(profile!.id),
    select: (res) => res.data,
    enabled: !!profile?.id,
  })

  const { data: followStatus } = useQuery({
    queryKey: ['followStatus', profile?.id],
    queryFn: () => relationsApi.status(profile!.id),
    select: (res) => res.data.following,
    enabled: !!profile?.id && !!currentUser && !isOwnProfile,
  })

  const { data: postCount } = useQuery({
    queryKey: ['postCount', profile?.id],
    queryFn: () => postsApi.countByUser(profile!.id),
    select: (res) => res.data.count,
    enabled: !!profile?.id,
  })

  const invalidateFollowData = () => {
    queryClient.invalidateQueries({ queryKey: ['followCounts', profile?.id] })
    queryClient.invalidateQueries({ queryKey: ['followStatus', profile?.id] })
    // The feed reads the *current* user's following list, not the profile being viewed —
    // without this, following/unfollowing someone wouldn't show up in your feed until the
    // 30s query staleTime happened to lapse on its own.
    queryClient.invalidateQueries({ queryKey: ['following', currentUser?.id] })
  }

  const followMutation = useMutation({
    mutationFn: () => relationsApi.follow(profile!.id),
    onSuccess: invalidateFollowData,
  })

  const unfollowMutation = useMutation({
    mutationFn: () => relationsApi.unfollow(profile!.id),
    onSuccess: invalidateFollowData,
  })

  const messageMutation = useMutation({
    mutationFn: () => conversationsApi.getOrCreate(profile!.id),
    onSuccess: (res) => {
      router.push(
        `/messages/${res.data.id}?participantId=${profile!.id}&username=${encodeURIComponent(profile!.username)}`,
      )
    },
  })

  const { data: postsData, status: postsStatus } = useInfiniteQuery({
    queryKey: ['userPosts', profile?.id],
    queryFn: ({ pageParam }) =>
      postsApi.listByUser(profile!.id, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.data.next_cursor || undefined,
    enabled: !!profile?.id,
  })

  const allPosts: Post[] = postsData?.pages.flatMap((p) => p.data.data) ?? []
  const postIds = allPosts.map((p) => p.id)

  const { data: likesByID } = useQuery({
    queryKey: ['likes', 'batch', postIds],
    queryFn: () => likesApi.batch(postIds),
    select: (res) => new Map(res.data.map((l) => [l.post_id, { count: l.count, liked: l.liked }])),
    enabled: postIds.length > 0,
    // Someone else's like doesn't invalidate our cache — only a refetch will see it.
    // Override the global 30s staleTime so switching back to this tab always pulls
    // fresh counts instead of serving what could be a stale snapshot from before.
    staleTime: 0,
  })

  const likeMutation = useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked ? likesApi.unlike(postId) : likesApi.like(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] })
    },
  })

  if (profileStatus === 'pending') {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (profileStatus === 'error' || !profile) {
    return (
      <div className="py-20 text-center text-sm text-zinc-400">User not found.</div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile header */}
      <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-2xl font-bold uppercase">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          ) : (
            profile.username[0]
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <h1 className="text-xl font-bold">{profile.username}</h1>
            {isOwnProfile ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/edit">Edit profile</Link>
              </Button>
            ) : (
              currentUser && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {followStatus ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={unfollowMutation.isPending}
                      onClick={() => unfollowMutation.mutate()}
                    >
                      Following
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={followMutation.isPending}
                      onClick={() => followMutation.mutate()}
                    >
                      Follow
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={messageMutation.isPending}
                    onClick={() => messageMutation.mutate()}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    Message
                  </Button>
                </div>
              )
            )}
          </div>
          {profile.bio && <p className="mt-1 text-sm text-zinc-600">{profile.bio}</p>}
          <div className="mt-3 flex justify-center gap-6 text-sm sm:justify-start">
            <span>
              <strong>{postCount ?? profile.post_count}</strong> posts
            </span>
            <Link href={`/profile/${profile.username}/followers`} className="hover:underline">
              <strong>{counts?.followers ?? profile.follower_count}</strong> followers
            </Link>
            <Link href={`/profile/${profile.username}/following`} className="hover:underline">
              <strong>{counts?.following ?? profile.following_count}</strong> following
            </Link>
          </div>
        </div>
      </div>

      {/* Post grid */}
      <div className="border-t border-zinc-200 pt-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-500">
          <Grid3x3 className="h-4 w-4" />
          Posts
        </div>

        {postsStatus === 'pending' && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        )}

        {postsStatus === 'success' && allPosts.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-400">No posts yet.</p>
        )}

        <div className="grid grid-cols-3 gap-1">
          {allPosts.map((post) => {
            const img = post.image_urls?.[0]
            const liked = likesByID?.get(post.id)?.liked ?? false
            const count = likesByID?.get(post.id)?.count ?? 0
            return (
              <div key={post.id} className="group relative aspect-square bg-zinc-100 overflow-hidden">
                {img ? (
                  <Image
                    src={img}
                    alt={post.caption || 'Post'}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    No image
                  </div>
                )}
                <button
                  type="button"
                  disabled={likeMutation.isPending}
                  onClick={() => likeMutation.mutate({ postId: post.id, liked })}
                  className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
                >
                  <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current text-accent')} />
                  {count}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
