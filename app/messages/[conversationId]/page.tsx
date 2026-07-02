'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { conversationsApi, type Message } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useMounted } from '@/lib/utils'
import { useSocketListener, sendTyping } from '@/lib/ws'

const TYPING_STOP_DEBOUNCE_MS = 2000
const TYPING_DISPLAY_MS = 3000

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams<{ conversationId: string }>()
  const searchParams = useSearchParams()
  const conversationId = params.conversationId
  const { isAuthenticated, user } = useAuthStore()
  const mounted = useMounted()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const [draft, setDraft] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)
  const hasMarkedReadRef = useRef(false)
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const typingClearTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const queryKey = ['messages', conversationId]

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => conversationsApi.messages(conversationId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.next_cursor || undefined,
    enabled: isAuthenticated && !!conversationId,
  })

  // Each page comes back newest-first; render oldest-first for a natural chat feed.
  const messages: Message[] = [...(data?.pages.flatMap((p) => p.data.data) ?? [])].reverse()

  const otherParticipantId =
    searchParams.get('participantId') || messages.find((m) => m.sender_id !== user?.id)?.sender_id || null
  const otherUsername = searchParams.get('username') || 'Conversation'

  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { root: scrollRef.current, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    if (status === 'success' && !hasScrolledRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      hasScrolledRef.current = true
    }
  }, [status])

  useEffect(() => {
    if (status !== 'success' || hasMarkedReadRef.current || messages.length === 0) return
    hasMarkedReadRef.current = true
    const lastMessage = messages[messages.length - 1]
    conversationsApi.markRead(conversationId, lastMessage.id).catch(() => {})
  }, [status, messages, conversationId])

  function scrollToBottom() {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 0)
  }

  useSocketListener((msg) => {
    if (msg.type === 'message.new') {
      const incoming = msg.data as Message
      if (incoming.conversation_id !== conversationId) return
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        const pages = [...old.pages]
        pages[0] = { ...pages[0], data: { ...pages[0].data, data: [incoming, ...pages[0].data.data] } }
        return { ...old, pages }
      })
      scrollToBottom()
    } else if (msg.type === 'typing.indicator') {
      const payload = msg.data as { conversation_id: string; user_id: string; typing: boolean }
      if (payload.conversation_id !== conversationId) return
      if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current)
      if (payload.typing) {
        setIsTyping(true)
        typingClearTimeoutRef.current = setTimeout(() => setIsTyping(false), TYPING_DISPLAY_MS)
      } else {
        setIsTyping(false)
      }
    }
  })

  function handleDraftChange(value: string) {
    setDraft(value)
    if (!otherParticipantId) return
    sendTyping('typing.start', conversationId, otherParticipantId)
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current)
    typingStopTimeoutRef.current = setTimeout(() => {
      sendTyping('typing.stop', conversationId, otherParticipantId)
    }, TYPING_STOP_DEBOUNCE_MS)
  }

  function handleBlur() {
    if (otherParticipantId) sendTyping('typing.stop', conversationId, otherParticipantId)
  }

  async function handleSend() {
    const content = draft.trim()
    if (!content || !user) return
    setDraft('')

    const optimisticID = `optimistic-${Date.now()}`
    const optimistic: Message = {
      id: optimisticID,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      type: 'text',
      created_at: new Date().toISOString(),
    }

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old
      const pages = [...old.pages]
      pages[0] = { ...pages[0], data: { ...pages[0].data, data: [optimistic, ...pages[0].data.data] } }
      return { ...old, pages }
    })
    scrollToBottom()

    try {
      const res = await conversationsApi.sendMessage(conversationId, content)
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        const pages = [...old.pages]
        pages[0] = {
          ...pages[0],
          data: {
            ...pages[0].data,
            data: pages[0].data.data.map((m: Message) => (m.id === optimisticID ? res.data : m)),
          },
        }
        return { ...old, pages }
      })
    } catch {
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        const pages = [...old.pages]
        pages[0] = {
          ...pages[0],
          data: { ...pages[0].data, data: pages[0].data.data.filter((m: Message) => m.id !== optimisticID) },
        }
        return { ...old, pages }
      })
    }
  }

  if (!mounted || !isAuthenticated) return null

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-xl flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
        <Link href="/messages" className="rounded-full p-1.5 hover:bg-zinc-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="font-semibold">{otherUsername}</h2>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto py-3">
        <div ref={topSentinelRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        )}

        {status === 'pending' && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}

        {messages.map((m) => {
          const isMine = m.sender_id === user?.id
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="px-1 text-[11px] text-zinc-400">{isMine ? 'You' : otherUsername}</span>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-900'
                }`}
              >
                {m.content}
              </div>
            </div>
          )
        })}

        {isTyping && <p className="px-1 text-xs text-zinc-400">{otherUsername} is typing…</p>}
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-200 pt-3">
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
          placeholder="Message…"
          className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-sm outline-none focus:border-primary/40"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          className="rounded-full bg-primary p-2 text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
