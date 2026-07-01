'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Grid3x3 } from 'lucide-react'
import { postsApi, usersApi, type Post } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const currentUser = useAuthStore((s) => s.user)

  const { data: profile, status: profileStatus } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.getProfile(username),
    select: (res) => res.data,
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
      <div className="mb-8 flex items-center gap-8">
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
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{profile.username}</h1>
            {currentUser?.username === profile.username && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/edit">Edit profile</Link>
              </Button>
            )}
          </div>
          {profile.bio && <p className="mt-1 text-sm text-zinc-600">{profile.bio}</p>}
          <div className="mt-3 flex gap-6 text-sm">
            <span>
              <strong>{profile.post_count}</strong> posts
            </span>
            <span>
              <strong>{profile.follower_count}</strong> followers
            </span>
            <span>
              <strong>{profile.following_count}</strong> following
            </span>
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
            return (
              <div key={post.id} className="aspect-square bg-zinc-100 overflow-hidden">
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
