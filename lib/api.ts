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
