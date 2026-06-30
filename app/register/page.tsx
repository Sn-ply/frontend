'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(30).regex(/^\w+$/, 'Letters, numbers, underscore only'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError('')
    try {
      await authApi.register(data.email, data.username, data.password)
      router.push('/login')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Registration failed'
      setServerError(message)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm text-zinc-500">Join Snaply and share your moments</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Username</label>
              <Input placeholder="johndoe" {...register('username')} />
              {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
            {serverError && <p className="text-sm text-red-500">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
