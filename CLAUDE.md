# frontend

Next.js 14 App Router web client for Snaply. TypeScript strict, talks only to `api-gateway` (port 8080), never directly to backend services.

## Stack

- Next.js 14 App Router, TypeScript strict
- Tailwind CSS; shadcn/ui components hand-built under `components/ui/`
- TanStack Query v5 for server state / infinite scroll
- Zustand for the auth store (`lib/store.ts`) — access/refresh tokens, current user
- Axios (`lib/axios.ts`) with a refresh-token interceptor
- React Hook Form + Zod for form validation

## Layout

`app/` (routes, layout, global styles) · `components/` (nav, post-card, image-uploader, user-list, providers) · `lib/` (`api.ts` request wrappers, `axios.ts` client, `store.ts` Zustand store, `token.ts` localStorage helpers, `utils.ts`)

## Pages

| Route                            | Auth required | Description                              |
|-----------------------------------|---------------|--------------------------------------------|
| `/login`                          | —             | Email + password login                     |
| `/register`                       | —             | Create account                              |
| `/feed`                           | yes           | Infinite scroll feed (own posts + follows)  |
| `/create-post`                    | yes           | Caption + drag-and-drop image upload        |
| `/profile/[username]`             | —             | Public profile, grid, follow/unfollow       |
| `/profile/[username]/followers`   | —             | Resolved list of followers                  |
| `/profile/[username]/following`   | —             | Resolved list of who they follow            |
| `/profile/edit`                   | yes           | Update bio + avatar (own profile only)      |

## Follow graph, likes & comments

- Follow/unfollow, follow status, and counts all come from `relation-service` (`lib/api.ts`'s `relationsApi`), not from `user-service`'s static `follower_count`/`following_count` fields. Post count similarly comes from `postsApi.countByUser()` (post-service), not `user-service`'s static `post_count`.
- `relation-service` and `like-service` only return user/post IDs — the frontend resolves them to display profiles via `usersApi.batch()`. `components/user-list.tsx` does this and re-sorts the resolved profiles back into the original ID order, since batch lookups don't preserve order.
- The feed's `followed_user_ids` param is built client-side: `[currentUser.id, ...following]`, fetched from `relationsApi.following()`. Post authorship in the feed is resolved the same batch way — don't assume every post in the feed belongs to the logged-in user.
- Likes: the feed page fetches counts + "did I like this" for every visible post in one call (`likesApi.batch()`), then passes `initialLikeCount`/`initialLiked` into each `PostCard`. `PostCard` owns the actual like/unlike mutation with optimistic local state (toggles immediately, reverts on error) and invalidates the `['likes']` query prefix on settle so the batch re-fetches fresh counts. Don't switch this to a per-card fetch — that turns one request per feed page into one per post.
- Comments live inline in `PostCard` (expand/collapse via the Comment button), fetched/created through `commentsApi`. There's no dedicated single-post page.

## Auth flow

1. `login` → `POST /api/v1/auth/login` → tokens stored in localStorage via `lib/token.ts`
2. Axios request interceptor attaches `Authorization: Bearer <token>`
3. On 401 → `POST /api/v1/auth/refresh` with refresh token → retry original request
4. On a second 401 → clear tokens, redirect to `/login`

## Running

```bash
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3000
```

`NEXT_PUBLIC_API_BASE_URL` must point at the running `api-gateway`.
