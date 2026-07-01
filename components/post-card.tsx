import { Heart, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Post } from '@/lib/api'
import { Card, CardContent, CardFooter, CardHeader } from './ui/card'

interface PostCardProps {
  post: Post
  username?: string
}

export function PostCard({ post, username }: PostCardProps) {
  const firstImage = post.image_urls?.[0]

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

      <CardFooter className="gap-4 text-zinc-500">
        <button className="flex items-center gap-1 text-sm transition-colors hover:text-accent">
          <Heart className="h-4 w-4" />
          <span>Like</span>
        </button>
        <button className="flex items-center gap-1 text-sm transition-colors hover:text-primary">
          <MessageCircle className="h-4 w-4" />
          <span>Comment</span>
        </button>
      </CardFooter>
    </Card>
  )
}
