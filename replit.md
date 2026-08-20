# Bridging Abilities Workplace Messaging

Native Expo React Native workplace messaging app for private employee and management communication.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `pnpm --filter @workspace/workplace-messaging run typecheck` — check the mobile app
- `pnpm --filter @workspace/workplace-messaging run dev` — start the Expo preview through its managed workflow

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/workplace-messaging/app/` — Expo Router screens and navigation
- `artifacts/workplace-messaging/components/` — reusable glass UI, avatars, screen shells, and interaction primitives
- `artifacts/workplace-messaging/context/AppContext.tsx` — local mock state and the future service seam
- `artifacts/workplace-messaging/data/mockData.ts` — Version 1 demo data
- `artifacts/workplace-messaging/types/app.ts` — domain interfaces for users, conversations, messages, and approvals
- `artifacts/workplace-messaging/constants/colors.ts` — light/dark semantic theme tokens

## Architecture decisions

- Version 1 is intentionally frontend-first and uses local mock data; Supabase should replace the context's data operations rather than the screen contracts.
- Account approval is represented as a first-class flow: sign-up leads to a pending screen, while admin actions operate on pending registrations.
- Announcements are a distinct conversation kind and remain pinned above normal chats.
- Native iOS 26 tabs use NativeTabs when available, with a BlurView-backed classic tab fallback for Android and older iOS.

## Product

The app includes a welcome/sign-up/pending-approval flow, chats with a permanently pinned announcements channel, one-to-one and group conversation UI, a glass message composer with local send behavior, searchable staff directory, staff profiles, settings with light/dark mode, and an admin approval area.

## User preferences

- Keep this as a native React Native + Expo app; do not convert it to a web app, PWA, or WebView.
- Preserve the Bridging Abilities identity and use the approved eight-hue palette for sender names; do not use the restricted status colours or royal blue.

## Gotchas

- Use the managed `artifacts/workplace-messaging: expo` workflow rather than starting Expo directly in the shell.
- If the API contract is added later, update OpenAPI and regenerate shared client types before consuming new server endpoints.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
