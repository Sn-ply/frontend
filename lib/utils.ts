import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useEffect, useState } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// The auth store reads localStorage synchronously at module load, so on the client
// it's already populated by the time of the first render — but SSR always sees it
// empty. Gate any render that branches on auth state behind this so the first client
// paint matches the server-rendered markup, then swap in the real content post-mount.
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
