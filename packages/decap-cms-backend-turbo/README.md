# Decap CMS — Turbo Backend

**This backend is under active development.**

This package replaces the standard GitHub OAuth flow with Supabase email/password authentication, and adds a Supabase-backed cache that makes large-collection entry loading significantly faster.

## Architecture

The backend is built in two layers.

### 1. Auth layer (`implementation.tsx`)

Users sign in with their email and password via a custom login page. Authentication is handled entirely by Supabase Auth — no GitHub OAuth app or personal access token is required from the user. After login, the Supabase JWT is used as a Bearer token for all GitHub API calls, which are proxied through Supabase.

The implementation also handles token refresh automatically: if the Supabase JWT is close to expiry it is silently refreshed in the background, and the updated tokens are persisted back to the Decap CMS auth store.

### 2. DB cache layer (`supabase.ts`)

For folder collections, entry data is mirrored into a Supabase table. The flow on every collection load is:

1. Fetch the file list from GitHub.
2. Diff it against the cached rows in Supabase.
3. Remove stale rows; insert any missing rows in batches.
4. Return entries from Supabase, filtered by `repo`, `site_id`, `branch`, and `collection`.

Each cached row is keyed by:

| column | description |
|---|---|
| `repo` | GitHub repository (`owner/repo`) |
| `site_id` | identifies which site owns the row when multiple sites share one Supabase project |
| `branch` | Git branch |
| `collection` | folder + extension + depth fingerprint |
| `file_id` | Git blob SHA |

## Decap CMS config

```yaml
backend:
  name: decap-turbo
  repo: owner/repo
  branch: main

  # Full Supabase project URL — used by the auth page and token refresh.
  base_url: https://your-project-ref.supabase.co
  api_root: https://your-project-ref.supabase.co/functions/v1/gh
  auth_endpoint: auth/v1/authorize
  auth_token_endpoint: auth/v1/token

  # Supabase project ref — used to build the PostgREST endpoint for the cache.
  app_id: your-project-ref

  # Supabase anon key — used for both auth API calls and cache queries.
  anon_key: your-supabase-anon-key

  # Stable identifier for this site.
  site_id: your-site-id
```

## Supabase setup

### Auth

Enable the **Email** provider in your Supabase project under Authentication → Providers. Create an account for each CMS user.

### Cache table

Create a table named `data` in the `public` schema:

```sql
create table public.data (
  id            bigserial primary key,
  repo          text not null,
  site_id       text not null,
  branch        text not null,
  collection    text not null,
  file_id       text not null,
  file_path     text not null,
  file_meta     jsonb not null,
  file_data     text
);

create unique index data_identity_idx
  on public.data (repo, site_id, branch, collection, file_id);
```

The unique index is required for the upsert merge resolution used by batch inserts.

Make sure the anon role has `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `public.data`, or configure an appropriate RLS policy.
