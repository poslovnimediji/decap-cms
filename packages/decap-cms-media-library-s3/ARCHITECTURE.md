# Technical Architecture

This document describes the current S3-compatible media library architecture.

## Project structure

```
packages/decap-cms-media-library-s3/
├── src/
│   ├── index.js
│   ├── types.ts
│   ├── api/
│   │   ├── client.ts
│   │   └── fileManager.ts
│   ├── components/
│   │   ├── S3Widget.tsx
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
2. S3 integration resolves request context from Decap backend/auth state.
3. Widget validates context (`token`, `siteId`, `edgeBaseUrl`).
4. `S3Client` sends requests to `/functions/v1/integrations/s3/<key>`.
5. Edge function signs the request with AWS SigV4 and forwards it to the
   site's configured S3-compatible endpoint (AWS S3, Cloudflare R2, etc.).

## Request contract used by client

For all list/upload/delete requests:

- `Authorization: Bearer <session_token>`
- `x-site-id: <active_site_id>`

Listing uses `ListObjectsV2` semantics forwarded as query parameters
(`list-type=2`, `delimiter=/`, `prefix=<path>`, `continuation-token=<token>`
when paginating). Upload/delete forward directly to `<key>`.

## Main modules

### `src/index.js`

- creates media library instance
- builds context resolver from Decap backend/auth state
- injects `resolveRequestContext` into widget

### `src/api/client.ts`

- low-level HTTP client to the edge function
- adds auth + site headers
- parses `ListObjectsV2` XML responses and follows pagination
  (`IsTruncated`/`NextContinuationToken`) until the full listing is fetched
- handles response parsing and error normalization

### `src/api/fileManager.ts`

- high-level file operations
- maps CMS-style paths (`/images/`) to S3 key prefixes (`images/`)
- public URL generation for inserted assets

### `src/components/S3Widget.tsx`

- validates context before usage
- handles browsing, upload, delete, and insert UX
- manages selection and loading/error state

## Provider compatibility

This is a generic S3-compatible integration, not tied to a single provider.
It works with any storage service that exposes an S3 REST-compatible
endpoint, since the SigV4 signing and request shape are the same across
providers — including AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean
Spaces, Wasabi, MinIO, Scaleway Object Storage, and Linode Object Storage.
Provider selection happens entirely through the `s3_endpoint` (and
`s3_force_path_style` for providers/self-hosted setups requiring path-style
addressing) site variable configured server-side — no client-side or
package-level provider branching exists.

## Security model

- No AWS/R2/provider credentials are stored client-side.
- Client only sends the active Decap session token and active site id.
- SigV4 signing and provider credentials are enforced server-side, in the
  `s3` integration adapter of decap-turbo's edge function.
- The destination host is derived only from that site's own configured
  `s3_endpoint` variable — never from anything the browser sends.

## Known constraints

- No search in the current implementation.
- "Folders" are an emulation over S3 key prefixes (via `Delimiter=/`), not
  real directories — deleting the last object under a prefix makes that
  "folder" disappear, matching native S3/R2 semantics.
- Buckets must already be publicly readable (directly, via a custom domain,
  or via a CDN) for `public_url_prefix` to resolve to usable asset URLs —
  this integration does not generate presigned GET URLs for viewing.
