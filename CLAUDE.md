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

`app/` (routes, layout, global styles) · `components/` (nav, post-card, providers) · `lib/` (`api.ts` request wrappers, `axios.ts` client, `store.ts` Zustand store, `token.ts` localStorage helpers, `utils.ts`)

## Pages

| Route                 | Auth required | Description             |
|------------------------|---------------|--------------------------|
| `/login`               | —             | Email + password login   |
| `/register`            | —             | Create account            |
| `/feed`                | yes           | Infinite scroll feed      |
| `/create-post`         | yes           | Caption + image URL(s)    |
| `/profile/[username]`  | —             | Public profile + grid     |

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
