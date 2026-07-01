'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { usersApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ImageUploader } from '@/components/image-uploader'

const schema = z.object({
  bio: z.string().max(150, 'Max 150 characters'),
  avatar: z.array(z.string()).max(1),
})

type FormData = z.infer<typeof schema>

export default function EditProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const { data: profile, status } = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: () => usersApi.getProfile(user!.username),
    select: (res) => res.data,
    enabled: !!user?.username,
  })

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bio: '', avatar: [] },
  })

  useEffect(() => {
    if (profile) {
      reset({
        bio: profile.bio ?? '',
        avatar: profile.avatar_url ? [profile.avatar_url] : [],
      })
    }
  }, [profile, reset])

  const updateProfile = useMutation({
    mutationFn: (data: FormData) => usersApi.updateMe(data.bio, data.avatar[0] ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.username] })
      router.push(`/profile/${user?.username}`)
    },
  })

  if (!isAuthenticated) return null

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold">Edit profile</h1>
          <p className="text-sm text-zinc-500">Update your photo and bio</p>
        </CardHeader>
        <CardContent>
          {status === 'pending' ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit((data) => updateProfile.mutate(data))} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Profile photo</label>
                <Controller
                  control={control}
                  name="avatar"
                  render={({ field }) => (
                    <ImageUploader value={field.value} onChange={field.onChange} max={1} circle />
                  )}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tell people about yourself…"
                  {...register('bio')}
                />
                {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
              </div>

              {updateProfile.isError && (
                <p className="text-sm text-red-500">Failed to update profile. Try again.</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting || updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
