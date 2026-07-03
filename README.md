# frontend

<img width="360" height="739" alt="login" src="https://github.com/user-attachments/assets/3e2bf8af-b192-4267-89e1-1946480c209b" />

<img width="357" height="739" alt="profile" src="https://github.com/user-attachments/assets/d5643f36-9107-45c9-863a-d09936d33cfb" />

<img width="357" height="735" alt="create_post" src="https://github.com/user-attachments/assets/68152306-c232-4b36-8d28-771c1ca82184" />

<img width="354" height="735" alt="chat" src="https://github.com/user-attachments/assets/0cdb5007-f011-4389-9928-4398ff53ffee" />



Next.js 14 App Router frontend for Snaply.

## Stack

- **Next.js 14** — App Router, TypeScript strict
- **Tailwind CSS** — styling
- **shadcn/ui components** — built manually in `components/ui/`
- **TanStack Query v5** — server state, infinite scroll
- **Zustand** — auth store (access/refresh token, user)
- **Axios** — HTTP client with refresh-token interceptor
- **React Hook Form + Zod** — form validation

## Environment Variables

| Variable                  | Description                       |
|---------------------------|-----------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`| API Gateway base URL              |

## How to Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route                  | Auth required | Description             |
|------------------------|---------------|-------------------------|
| `/login`               | —             | Email + password login  |
| `/register`            | —             | Create account          |
| `/feed`                | yes           | Infinite scroll feed    |
| `/create-post`         | yes           | Caption + image URL(s)  |
| `/profile/[username]`  | —             | Public profile + grid   |

## Auth flow

1. `login` → POST `/api/v1/auth/login` → store tokens in localStorage via `lib/token.ts`
2. Axios interceptor attaches `Authorization: Bearer <token>` to every request
3. On 401 → POST `/api/v1/auth/refresh` with refresh token → retry original request
4. On second 401 → clear tokens, redirect to `/login`
