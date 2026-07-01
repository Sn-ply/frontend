'use client'

import { useEffect, useState } from 'react'
import { Heart, MessageCircle, Loader2, Send } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi, likesApi, usersApi, type Post } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardFooter, CardHeader } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface PostCardProps {
  post: Post
  username?: string
  initialLikeCount?: number
  initialLiked?: boolean
}

export function PostCard({ post, username, initialLikeCount = 0, initialLiked = false }: PostCardProps) {
  const firstImage = post.image_urls?.[0]
  const [draft, setDraft] = useState('')
  const queryClient = useQueryClient()

  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)

  useEffect(() => {
    setLiked(initialLiked)
    setLikeCount(initialLikeCount)
  }, [initialLiked, initialLikeCount])

  const likeMutation = useMutation({
    mutationFn: () => (liked ? likesApi.unlike(post.id) : likesApi.like(post.id)),
    onMutate: () => {
      const wasLiked = liked
      setLiked(!wasLiked)
      setLikeCount((c) => c + (wasLiked ? -1 : 1))
    },
    onError: () => {
      setLiked(initialLiked)
      setLikeCount(initialLikeCount)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] })
    },
  })

  const { data: comments, status: commentsStatus } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => commentsApi.list(post.id),
    select: (res) => res.data.data,
  })

  const commenterIds = Array.from(new Set((comments ?? []).map((c) => c.user_id)))

  const { data: commentersByID } = useQuery({
    queryKey: ['commentAuthors', commenterIds],
    queryFn: () => usersApi.batch(commenterIds),
    select: (res) => new Map(res.data.map((u) => [u.id, u.username])),
    enabled: commenterIds.length > 0,
  })

  const addComment = useMutation({
    mutationFn: (content: string) => commentsApi.create(post.id, content),
    onSuccess: () => {
      setDraft('')
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const content = draft.trim()
    if (content) addComment.mutate(content)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium uppercase">
            {username?.[0] ?? '?'}
          </div>
          <Link
            href={username ? `/profile/${username}` : '#'}
            className="text-sm font-medium hover:underline"
          >
            {username ?? post.user_id.slice(0, 8)}
          </Link>
          <span className="ml-auto text-xs text-zinc-400">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>

      {firstImage && (
        <div className="relative aspect-square bg-zinc-100">
          <Image
            src={firstImage}
            alt={post.caption || 'Post image'}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}

      <CardContent className="pt-3">
        {post.caption && <p className="text-sm">{post.caption}</p>}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 text-zinc-500">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            className={cn(
              'flex items-center gap-1 text-sm transition-colors hover:text-accent',
              liked && 'text-accent',
            )}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
            <span>Like</span>
          </button>
          <div className="flex items-center gap-1 text-sm">
            <MessageCircle className="h-4 w-4" />
            <span>Comment</span>
          </div>
        </div>

        <p className="text-sm font-medium text-foreground">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </p>

        <div className="space-y-3 border-t border-zinc-100 pt-3">
          {commentsStatus === 'pending' && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          )}

          {commentsStatus === 'success' && comments!.length === 0 && (
            <p className="text-xs text-zinc-400">No comments yet — be the first to say something.</p>
          )}

          {comments?.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{commentersByID?.get(c.user_id) ?? c.user_id.slice(0, 8)}</span>{' '}
              <span className="text-zinc-700">{c.content}</span>
            </div>
          ))}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              className="h-9 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={addComment.isPending || !draft.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardFooter>
    </Card>
  )
}
