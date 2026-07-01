'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ImageUploader } from '@/components/image-uploader'

const schema = z.object({
  caption: z.string().max(2200, 'Max 2200 characters'),
  images: z.array(z.string()).min(1, 'Add at least one image').max(4, 'Up to 4 images per post'),
})

type FormData = z.infer<typeof schema>

export default function CreatePostPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { caption: '', images: [] },
  })

  const createPost = useMutation({
    mutationFn: (data: FormData) => postsApi.create(data.caption, data.images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      router.push('/feed')
    },
  })

  if (!isAuthenticated) return null

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold">New Post</h1>
          <p className="text-sm text-zinc-500">Share a moment with your followers</p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => createPost.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium">Caption</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Write a caption…"
                {...register('caption')}
              />
              {errors.caption && <p className="text-xs text-red-500">{errors.caption.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Photos</label>
              <Controller
                control={control}
                name="images"
                render={({ field }) => (
                  <ImageUploader
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.images?.message}
                  />
                )}
              />
            </div>

            {createPost.isError && (
              <p className="text-sm text-red-500">Failed to create post. Try again.</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || createPost.isPending}>
              {createPost.isPending ? 'Posting…' : 'Share post'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
