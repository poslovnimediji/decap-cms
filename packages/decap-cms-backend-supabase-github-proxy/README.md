# GitHub Backend with Supabase Proxy

This package extends the Decap CMS GitHub backend with a Supabase-backed cache layer for entry discovery and search.

## Status

This backend is under active development.

## Architecture

At a high level, the backend works in two layers:

1. It still uses the regular GitHub backend for repository access, authentication, listing files, and reading file contents/metadata.
2. It mirrors entry data into a Supabase table and reads from that table for folder entry retrieval and search.

The current flow for folder collections is:

1. List files from GitHub.
2. Compare the GitHub file list with the cached rows in Supabase.
3. Remove stale rows and insert missing rows into Supabase.
4. Read entries back from Supabase, filtered by repository, branch, collection, and `site_id`.

Each cached row is scoped by these fields:

- `repo`
- `site_id`
- `branch`
- `collection`
- `file_id`

`site_id` is used to separate rows that belong to different sites sharing the same Supabase project or table.

## Decap CMS config

```yaml
backend:
  name: supabase-github-proxy
  repo: owner/repo
  branch: main

  # Supabase project reference used to build:
  # https://<app_id>.supabase.co/rest/v1/data
  app_id: your-supabase-project-ref

  # Supabase REST API key used for requests.
  # anon_key is preferred.
  anon_key: your-supabase-anon-key

  # Required for cache partitioning between sites.
  site_id: your-site-id
```

Notes:

- `site_id` is the identifier written into the `site_id` column in Supabase and should be stable per site.
- `app_id` is currently still used to derive the Supabase project URL.
- `anon_key` is used for authentication with the Supabase REST API.

## Supabase setup

This backend expects a Supabase table exposed through PostgREST at:

```text
https://<app_id>.supabase.co/rest/v1/data
```

Create a table named `data` with columns compatible with the payload written by the backend:

- `repo` text not null
- `site_id` text not null
- `branch` text not null
- `collection` text not null
- `file_id` text not null
- `file_path` text not null
- `file_meta` jsonb not null
- `file_data` text

Create a unique constraint covering the row identity used by upserts:

```sql
create unique index data_repo_site_branch_collection_file_idx
on public.data (repo, site_id, branch, collection, file_id);
```

The backend uses:

- `GET` requests to read cached rows
- `POST` requests with merge resolution for upserts
- `DELETE` requests to remove rows no longer present in GitHub

Make sure the API key you provide has permission to read, insert, update, and delete rows in `public.data`.
