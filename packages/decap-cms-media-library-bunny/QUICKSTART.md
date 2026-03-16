# Quick Start Example

This is a minimal working example for using the Bunny media library with Decap CMS through the backend edge proxy.

## 1) Install dependencies

```bash
npm install decap-cms-app decap-cms-media-library-bunny decap-cms-backend-turbo
```

## 2) Register the media library

In your admin entry file:

```javascript
import DecapCMS from 'decap-cms-app';
import BunnyMediaLibrary from 'decap-cms-media-library-bunny';

DecapCMS.registerMediaLibrary(BunnyMediaLibrary);
```

## 3) Configure Decap backend + Bunny media library

In `config.yml`:

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

media_library:
  name: bunny
  config:
    cdn_url_prefix: https://your-zone.b-cdn.net
    root_path: /cms-media/
```

Notes:

- Bunny config only needs CDN/public path behavior.
- Auth and site context are resolved from the active backend session.

## 4) Ensure edge function contract is available

The backend must expose:

- `https://<PROJECT_REF>.supabase.co/functions/v1/bunny/...`
- `Authorization: Bearer <access_token>`
- `x-site-id: <site_uuid>`

The Bunny library sends these automatically using Decap backend context.

## 5) Start the app

```bash
npm run start
```

Open your admin UI and test any `image` field.

## Troubleshooting

### Media library opens but shows auth error

- Verify your Decap user is logged in.
- Verify backend session has a valid access token.

### Missing site id error

- Verify `backend.site_id` is set.
- Verify the authenticated user has access to that site.

### Edge proxy request fails

- Verify `backend.base_url` is correct.
- Verify `functions/v1/bunny` is deployed and reachable.

## Next steps

- See [SETUP.md](./SETUP.md) for detailed setup.
- See [TESTING.md](./TESTING.md) for test scenarios.
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details.
