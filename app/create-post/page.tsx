'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Trash2 } from 'lucide-react'
import { postsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const schema = z.object({
  caption: z.string().max(2200, 'Max 2200 characters'),
  imageUrls: z.array(z.object({ url: z.string().url('Must be a valid URL') })).min(1, 'At least one image URL required'),
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
    defaultValues: { caption: '', imageUrls: [{ url: '' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'imageUrls' })

  const createPost = useMutation({
    mutationFn: (data: FormData) =>
      postsApi.create(data.caption, data.imageUrls.map((i) => i.url)),
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
                className="flex min-h-[100px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                placeholder="Write a caption…"
                {...register('caption')}
              />
              {errors.caption && <p className="text-xs text-red-500">{errors.caption.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image URLs</label>
              <p className="text-xs text-zinc-400">
                Paste direct image URLs — file upload will be available with media-service.
              </p>
              {fields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <Input placeholder="https://example.com/photo.jpg" {...register(`imageUrls.${i}.url`)} />
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {errors.imageUrls && (
                <p className="text-xs text-red-500">
                  {errors.imageUrls.message ?? errors.imageUrls[0]?.url?.message}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ url: '' })}
                className="gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                Add image
              </Button>
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
