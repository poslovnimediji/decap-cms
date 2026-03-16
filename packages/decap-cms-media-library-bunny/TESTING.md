# Integration Testing Guide

This guide covers testing Bunny media library behavior in the current edge-proxy model.

## Local validation

From repository root:

```bash
npm run test:unit -- --runInBand \
  packages/decap-cms-media-library-bunny/src/__tests__/client.test.ts \
  packages/decap-cms-media-library-bunny/src/__tests__/fileManager.test.ts
```

## Manual test config

Use a backend config that includes:

- `backend.base_url`
- `backend.site_id`
- active authenticated user session

Media library config only needs:

```yaml
media_library:
  name: bunny
  config:
    cdn_url_prefix: https://your-zone.b-cdn.net
    root_path: /
```

## Functional scenarios

### 1. File browsing

- Open an image field.
- Verify folder navigation and listing.

Expected:

- Files/folders render.
- Breadcrumb and parent navigation work.

### 2. Single insert

- Select one file.
- Click `Insert`.

Expected:

- One URL is inserted into the field.
- Modal closes.

### 3. Multiple insert

- In multi-select mode, select multiple files.
- Click `Insert`.

Expected:

- Multiple URLs are inserted.

### 4. Upload

- Upload one or more files.

Expected:

- Progress updates.
- Files appear in listing.
- Single upload in single-select mode auto-inserts.

### 5. Delete

- Delete a file and confirm.

Expected:

- File is removed from listing.

## Error-path scenarios

### Missing session token

Expected message:

- `Session token not found. Please log in again.`

### Missing site context

Expected message:

- `Active site id is missing in backend configuration.`

### Missing backend base URL

Expected message:

- `Backend base URL is missing. Configure backend.base_url.`

### Backend authorization failures

Expected behavior:

- 401/403/500 responses are surfaced as load/upload/delete errors.

## Reporting issues

Include:

- browser + OS
- sanitized backend/media config
- repro steps
- expected vs actual
- network response details for `/functions/v1/bunny/*`
