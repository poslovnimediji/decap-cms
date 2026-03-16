# Bunny Media Library Setup

This guide describes the current Bunny integration model: client requests go through the backend edge proxy with backend-provided auth/site context.

## Prerequisites

- Decap CMS with `decap-turbo` backend
- Deployed `bunny` edge function (`/functions/v1/bunny`)
- Bunny CDN URL prefix for public media URLs

## 1) Install and register

```bash
npm install decap-cms-media-library-bunny
```

```javascript
import DecapCMS from 'decap-cms-app';
import BunnyMediaLibrary from 'decap-cms-media-library-bunny';

DecapCMS.registerMediaLibrary(BunnyMediaLibrary);
```

## 2) Configure backend

Your backend config must include session + site context fields:

```yaml
backend:
  name: decap-turbo
  repo: owner/repo
  branch: main

  base_url: https://your-project-ref.supabase.co
  api_root: https://your-project-ref.supabase.co/functions/v1/gh
  auth_endpoint: auth/v1/authorize
  auth_token_endpoint: auth/v1/token

  app_id: your-project-ref
  anon_key: your-supabase-anon-key
  site_id: your-site-uuid
```

## 3) Configure media library

```yaml
media_library:
  name: bunny
  config:
    cdn_url_prefix: https://your-zone.b-cdn.net
    root_path: /
```

Supported Bunny-specific config:

- `cdn_url_prefix` (required)
- `root_path` (optional)

## 4) Edge function expectations

Requests are sent to:

`https://<PROJECT_REF>.supabase.co/functions/v1/bunny/<storage-path>`

With headers:

- `Authorization: Bearer <access_token>`
- `x-site-id: <site_uuid>`

The library resolves both from Decap backend/auth context.

## 5) Verify integration

- Open an `image` widget in Decap.
- Confirm files list loads.
- Upload/select/delete a test image.

## Troubleshooting

### `Session token not found`

- Log in again via Decap auth page.
- Confirm backend auth state is persisted.

### `Active site id is missing`

- Set `backend.site_id`.
- Confirm user has site membership on backend.

### `Backend base URL is missing`

- Set `backend.base_url`.

### Requests fail with 401/403

- 401: token missing/invalid
- 403: authenticated user lacks access to requested site
