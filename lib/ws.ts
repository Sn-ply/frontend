'use client'

import { useEffect, useRef } from 'react'
import { tokenStorage } from './token'

export interface SocketMessage {
  type: string
  data: unknown
}

type Listener = (msg: SocketMessage) => void

// A single shared connection, ref-counted across every mounted useSocketListener —
// the nav bell and the chat page both need live events, but there should only ever
// be one WebSocket per tab (api-gateway replaces the old connection otherwise).
let socket: WebSocket | null = null
let listenerCount = 0
const listeners = new Set<Listener>()

function wsBaseURL(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'
  return apiBase.replace(/^http/, 'ws')
}

function connect() {
  if (socket) return
  const token = tokenStorage.getAccess()
  if (!token) return

  socket = new WebSocket(`${wsBaseURL()}/ws?token=${token}`)
  socket.onmessage = (event) => {
    let msg: SocketMessage
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }
    listeners.forEach((l) => l(msg))
  }
  socket.onclose = () => {
    socket = null
  }
}

// sendTyping fires typing.start/typing.stop straight through the hub — api-gateway
// forwards these directly to the recipient with no DB write or Kafka publish.
export function sendTyping(type: 'typing.start' | 'typing.stop', conversationId: string, recipientId: string) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, conversation_id: conversationId, recipient_id: recipientId }))
  }
}

export function useSocketListener(onMessage: Listener) {
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  useEffect(() => {
    connect()
    listenerCount++
    const wrapped: Listener = (msg) => handlerRef.current(msg)
    listeners.add(wrapped)

    return () => {
      listeners.delete(wrapped)
      listenerCount--
      if (listenerCount <= 0 && socket) {
        socket.close()
        socket = null
      }
    }
  }, [])
}
