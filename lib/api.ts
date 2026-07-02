import api from './axios'
import type { AuthUser } from './store'

export interface Post {
  id: string
  user_id: string
  caption: string
  image_urls: string[]
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_comment_id?: string
  content: string
  created_at: string
}

export interface PublicProfile {
  id: string
  username: string
  bio: string
  avatar_url: string
  post_count: number
  follower_count: number
  following_count: number
}

interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string
}

// Auth
export const authApi = {
  register: (email: string, username: string, password: string) =>
    api.post<{ id: string; email: string; username: string }>('/api/v1/auth/register', {
      email,
      username,
      password,
    }),

  login: (email: string, password: string) =>
    api.post<{ user: AuthUser; access_token: string; refresh_token: string }>(
      '/api/v1/auth/login',
      { email, password },
    ),

  logout: (refreshToken: string) =>
    api.post('/api/v1/auth/logout', { refresh_token: refreshToken }),
}

// Users
export const usersApi = {
  getProfile: (username: string) =>
    api.get<PublicProfile>(`/api/v1/users/${username}`),

  updateMe: (bio: string, avatarUrl: string) =>
    api.put<AuthUser>('/api/v1/users/me', { bio, avatar_url: avatarUrl }),

  search: (q: string, cursor?: string) =>
    api.get<PaginatedResponse<PublicProfile>>('/api/v1/users/search', {
      params: { q, cursor, limit: 8 },
    }),

  batch: (ids: string[]) =>
    api.post<PublicProfile[]>('/api/v1/users/batch', { ids }),
}

// Relations (follow graph)
export const relationsApi = {
  follow: (userId: string) => api.post(`/api/v1/relations/${userId}/follow`),

  unfollow: (userId: string) => api.delete(`/api/v1/relations/${userId}/follow`),

  status: (userId: string) =>
    api.get<{ following: boolean }>(`/api/v1/relations/${userId}/status`),

  counts: (userId: string) =>
    api.get<{ followers: number; following: number }>(`/api/v1/relations/${userId}/counts`),

  followers: (userId: string, cursor?: string) =>
    api.get<PaginatedResponse<string>>(`/api/v1/relations/${userId}/followers`, {
      params: { cursor, limit: 50 },
    }),

  following: (userId: string, cursor?: string) =>
    api.get<PaginatedResponse<string>>(`/api/v1/relations/${userId}/following`, {
      params: { cursor, limit: 50 },
    }),
}

// Posts
export const postsApi = {
  create: (caption: string, imageUrls: string[]) =>
    api.post<Post>('/api/v1/posts', { caption, image_urls: imageUrls }),

  getById: (id: string) =>
    api.get<Post>(`/api/v1/posts/${id}`),

  delete: (id: string) =>
    api.delete(`/api/v1/posts/${id}`),

  listByUser: (userId: string, cursor?: string) =>
    api.get<PaginatedResponse<Post>>(`/api/v1/users/${userId}/posts`, {
      params: { cursor, limit: 12 },
    }),

  getFeed: (followedUserIds: string[], cursor?: string) =>
    api.get<PaginatedResponse<Post>>('/api/v1/feed', {
      params: {
        followed_user_ids: followedUserIds.join(','),
        cursor,
        limit: 10,
      },
    }),

  countByUser: (userId: string) =>
    api.get<{ count: number }>(`/api/v1/users/${userId}/posts/count`),
}

// Likes
export interface LikeSummary {
  post_id: string
  count: number
  liked: boolean
}

export const likesApi = {
  like: (postId: string) => api.post(`/api/v1/likes/${postId}`),

  unlike: (postId: string) => api.delete(`/api/v1/likes/${postId}`),

  batch: (postIds: string[]) =>
    api.post<LikeSummary[]>('/api/v1/likes/batch', { post_ids: postIds }),
}

// Notifications
export interface Notification {
  id: string
  recipient_id: string
  type: string
  actor_id: string
  actor_username: string
  entity_id: string
  entity_type: string
  content_preview: string
  read: boolean
  grouped: boolean
  group_count: number
  created_at: string
  read_at?: string
}

export const notificationsApi = {
  list: (cursor?: string) =>
    api.get<PaginatedResponse<Notification>>('/api/v1/notifications', {
      params: { cursor, limit: 10 },
    }),

  markRead: (id: string) => api.put(`/api/v1/notifications/${id}/read`),

  markAllRead: () => api.put('/api/v1/notifications/read'),

  unreadCount: () => api.get<{ count: number }>('/api/v1/notifications/unread-count'),
}

// Messages (direct messaging)
export interface Conversation {
  id: string
  participant_one_id: string
  participant_two_id: string
  last_message_id?: string
  last_message_at?: string
  created_at: string
}

export interface ConversationSummary {
  conversation: Conversation
  other_participant_id: string
  other_username: string
  last_message_preview: string
  unread_count: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  media_url?: string
  type: string
  created_at: string
  deleted_at?: string
}

export const conversationsApi = {
  list: (cursor?: string) =>
    api.get<PaginatedResponse<ConversationSummary>>('/api/v1/conversations', {
      params: { cursor, limit: 20 },
    }),

  getOrCreate: (participantId: string) =>
    api.post<Conversation>('/api/v1/conversations', { participant_id: participantId }),

  messages: (conversationId: string, cursor?: string) =>
    api.get<PaginatedResponse<Message>>(`/api/v1/conversations/${conversationId}/messages`, {
      params: { cursor, limit: 30 },
    }),

  sendMessage: (conversationId: string, content: string) =>
    api.post<Message>(`/api/v1/conversations/${conversationId}/messages`, {
      content,
      type: 'text',
    }),

  markRead: (conversationId: string, lastMessageId: string) =>
    api.put(`/api/v1/conversations/${conversationId}/read`, { last_message_id: lastMessageId }),
}

export const messagesApi = {
  delete: (id: string) => api.delete(`/api/v1/messages/${id}`),
}

// Comments
export const commentsApi = {
  list: (postId: string, cursor?: string) =>
    api.get<PaginatedResponse<Comment>>(`/api/v1/posts/${postId}/comments`, {
      params: { cursor },
    }),

  create: (postId: string, content: string, parentCommentId?: string) =>
    api.post<Comment>(`/api/v1/posts/${postId}/comments`, {
      content,
      parent_comment_id: parentCommentId,
    }),
}
