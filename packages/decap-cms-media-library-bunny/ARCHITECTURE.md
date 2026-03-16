# Technical Architecture

This document describes the current Bunny media library architecture.

## Project structure

```
packages/decap-cms-media-library-bunny/
├── src/
│   ├── index.js
│   ├── types.ts
│   ├── api/
│   │   ├── client.ts
│   │   └── fileManager.ts
│   ├── components/
│   │   ├── BunnyWidget.tsx
│   │   ├── FileGrid.tsx
│   │   ├── FileBrowser.tsx
│   │   └── FileUpload.tsx
│   └── __tests__/
│       ├── client.test.ts
│       └── fileManager.test.ts
├── README.md
├── QUICKSTART.md
├── SETUP.md
└── TESTING.md
```

## High-level flow

1. Decap initializes external media library via `init()`.
2. Bunny integration resolves request context from Decap backend/auth state.
3. Widget validates context (`token`, `siteId`, `edgeBaseUrl`).
4. `BunnyClient` sends requests to `/functions/v1/bunny/<path>`.
5. Edge function forwards to Bunny Storage API server-side.

## Request contract used by client

For all list/upload/delete requests:

- `Authorization: Bearer <session_token>`
- `x-site-id: <active_site_id>`

Path forwarding:

- `edgeBaseUrl + '/' + normalizedPath`

## Main modules

### `src/index.js`

- creates media library instance
- builds context resolver from Decap backend/auth state
- injects `resolveRequestContext` into widget

### `src/api/client.ts`

- low-level HTTP client to edge function
- adds auth + site headers
- handles response parsing and error normalization

### `src/api/fileManager.ts`

- high-level file operations
- directory/path helpers
- CDN URL generation for inserted assets

### `src/components/BunnyWidget.tsx`

- validates context before usage
- handles browsing, upload, delete, and insert UX
- manages selection and loading/error state

## Security model

- No Bunny credentials are stored client-side.
- Client only sends active Decap session token and active site id.
- Authorization and Bunny credentials are enforced server-side in edge function.

## Known constraints

- No search/pagination in current implementation.
- Directory listing is loaded for current path only.
