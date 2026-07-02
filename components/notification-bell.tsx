'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Loader2 } from 'lucide-react'
import { notificationsApi, type Notification } from '@/lib/api'
import { useSocketListener } from '@/lib/ws'
import { cn } from '@/lib/utils'

function label(n: Notification): string {
  const actor = n.actor_username || 'Someone'
  const extra = n.group_count > 1 ? ` and ${n.group_count - 1} other${n.group_count > 2 ? 's' : ''}` : ''
  switch (n.type) {
    case 'post_liked':
      return `${actor}${extra} liked your post`
    case 'post_commented':
      return `${actor} commented on your post`
    case 'user_followed':
      return `${actor} started following you`
    case 'comment_liked':
      return `${actor} liked your comment`
    case 'message_received':
      return `${actor} sent you a message`
    case 'post_created':
      return `Your post was created`
    default:
      return 'New notification'
  }
}

export function NotificationBell() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    select: (res) => res.data.count,
    refetchInterval: 30_000,
  })

  const { data: notifications, isFetching } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list(),
    select: (res) => res.data.data,
    enabled: isOpen,
  })

  useSocketListener((msg) => {
    if (msg.type !== 'notification.new') return
    const notification = msg.data as Notification

    queryClient.setQueryData(['notifications', 'unread-count'], (old: any) => ({
      data: { count: (old?.data?.count ?? 0) + 1 },
    }))

    queryClient.setQueryData(['notifications', 'list'], (old: any) => {
      if (!old) return old
      const withoutDup = (old.data.data as Notification[]).filter((n) => n.id !== notification.id)
      return { ...old, data: { ...old.data, data: [notification, ...withoutDup] } }
    })
  })

  async function handleNotificationClick(n: Notification) {
    if (n.read) return

    queryClient.setQueryData(['notifications', 'list'], (old: any) => {
      if (!old) return old
      return {
        ...old,
        data: {
          ...old.data,
          data: (old.data.data as Notification[]).map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        },
      }
    })
    queryClient.setQueryData(['notifications', 'unread-count'], (old: any) => ({
      data: { count: Math.max(0, (old?.data?.count ?? 1) - 1) },
    }))

    await notificationsApi.markRead(n.id).catch(() => {})
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative rounded-full p-2 text-zinc-600 hover:bg-zinc-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {!!unreadCount && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-md">
          {isFetching && !notifications ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-zinc-400">No notifications yet</p>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  'flex w-full flex-col gap-0.5 border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-zinc-50',
                  !n.read && 'bg-blue-50/60',
                )}
              >
                <span>{label(n)}</span>
                <span className="text-xs text-zinc-400">{new Date(n.created_at).toLocaleString()}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
