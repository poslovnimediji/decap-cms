0# Large Collection Optimization: Architecture & Data Flow

## Current Architecture (Problem)

### High-Level Flow: Loading razpisi-archive

```
User clicks "razpisi-archive" collection
                    ↓
        Backend.listAllEntries()
                    ↓
    Implementation.allEntriesByFolder()
                    ↓
        GraphQLAPI.listFilesRecursive()
        (Get file structure: paths, names, SHAs)
                    ↓
        ❌ Problem 1: ~100+ directory queries
        ~1-2 seconds elapsed
                    ↓
        GraphQLAPI.batchReadFileMetadata()
        (Get author, updatedOn for EVERY file)
                    ↓
        ❌ Problem 2: 2500 files ÷ 20 batch = 125 queries!
        ~30-50 seconds elapsed
                    ↓
        Implementation.readFile() × 2500
        (Load actual file content, batched by 50)
                    ↓
        ❌ Problem 3: Semaphore limits to 10 concurrent downloads
        ~10-20 seconds more
                    ↓
        Apollo InMemoryCache stores everything
                    ↓
        ❌ Problem 4: Cache lost on page reload
                    ↓
        Backend.processEntries() transforms to EntryValue[]
                    ↓
    🎉 Total Time: 50-70 SECONDS
    User sees loading spinner for 50-70 seconds
```

### Caching Layers (Current - Broken)

```
┌─ Apollo InMemoryCache (Session-scoped) ─────────┐
│ ✓ Caches by file SHA (immutable blobs)          │
│ ✓ Default policy: CACHE_FIRST                   │
│ ✗ Lost on page reload                           │
│ ✗ Doesn't help with 50-70s initial load         │
└────────────────────────────────────────────────┘
                        ↓
┌─ Entry Cache (entryCache.ts) ──────────────────┐
│ ✓ Stores full EntryValue objects                │
│ ✓ localStorage-based persistence                │
│ ✗ 5-minute TTL (too short)                      │
│ ✗ NOT INTEGRATED into collection loading        │
│ ✗ Never actually called!                        │
└────────────────────────────────────────────────┘
                        ↓
┌─ Local Tree Cache (implementation.ts) ─────────┐
│ ✓ Stores file structure with branch SHA         │
│ ✓ Detects if local tree is stale                │
│ ✓ Implements differential sync logic            │
│ ✗ Only stores file PATHS, not SHAs              │
│ ✗ Not leveraged for entry content               │
└────────────────────────────────────────────────┘
                        ↓
┌─ HTTP Cache (Browser) ─────────────────────────┐
│ ✓ Caches HTTP responses                         │
│ ✗ Limited for GraphQL (everything is POST)      │
│ ✗ No control over TTL                           │
└────────────────────────────────────────────────┘
```

**Key Problem:** Three separate caching systems that don't work together!

---

## Solution 2: Granular File Hash Tracking

### What's Different

**Store file SHA in local tree:**

```typescript
// BEFORE (current)
interface LocalTree {
  head: string; // branch SHA
  files: {
    id: string;
    path: string;
    name: string;
    // ❌ Missing: actual file content SHA
  }[];
}

// AFTER (with Solution 2)
interface LocalTreeWithHashes {
  head: string; // branch SHA
  files: {
    id: string;
    path: string;
    name: string;
    sha: string; // ✓ FILE SHA - KEY CHANGE
  }[];
}
```

### New Flow: Differential Loading

```
User clicks "razpisi-archive"
                    ↓
    Backend.listAllEntries()
                    ↓
    Check local tree cache
    ├─ Not found? → listAllFilesAndPersist()
    └─ Found → Compare SHAs with remote
                    ↓
        getDiffFromLocalTree()
        (Compare file SHAs, not just existence)
                    ↓
        Result: 
        ├─ Added files (2500 total - 2480 unchanged = 20 new)
        ├─ Modified files (15 files with changed SHA)
        └─ Deleted files (5 removed)
                    ↓
        ❌ ONLY load: 20 + 15 = 35 entries (not 2500!)
                    ↓
        batchReadFileMetadata() for 35 files
        35 ÷ 20 = 2 queries (not 125!)
                    ↓
        readFile() for 35 files
        (in 1 batch, not 50 batches)
                    ↓
        Combine with cached entries from local tree
        ├─ 35 fresh entries (just loaded)
        └─ 2480 cached entries (unchanged, reuse from local tree)
                    ↓
    🎉 Total Time: 2-5 SECONDS
    Only loaded what changed!
```

### Data Structure Evolution

```
Session Start:
┌───────────────────────────────────────────┐
│ Local Tree Cache (localStorage)            │
│ ┌─────────────────────────────────────┐   │
│ │ branch: "main"                      │   │
│ │ head: "abc123..."                   │   │
│ │ files: [                            │   │
│ │   {                                 │   │
│ │     path: "content/post-1.md"       │   │
│ │     id: "sha1"                      │   │
│ │     sha: "file-sha-1" ← NEW!        │   │
│ │   },                                │   │
│ │   ... 2499 more entries ...         │   │
│ │ ]                                   │   │
│ └─────────────────────────────────────┘   │
│ Size: ~50KB (paths) + 40KB (SHAs) = 90KB │
└───────────────────────────────────────────┘
                    ↓
Compare with GitHub:
├─ HEAD is "abc123..." (same) ✓
├─ Files with SHA = "abc..." (2480 unchanged)
├─ Files with SHA ≠ "abc..." (15 changed)
└─ Files not in local tree (20 added)
                    ↓
Only fetch changed entries (35 total)
```

---

## Solution 3C: SHA-Based Metadata Caching

### Metadata is Immutable

```
File Content          File SHA           Metadata
════════════════      ═════════          ════════
"Hello World"  ───→  "abc123"    ────→  {
                                          author: "Alice",
                                          date: "2024-01-01"
                                        }

Change content    ───→  "def456"    ────→  {
"Hello Universe"                         author: "Alice",
                                          date: "2024-01-02"
                                        }

Same SHA      ───→  "abc123"    ────→  Same metadata!
"Hello World"
```

**Key Insight:** If SHA is identical, metadata is identical!

### Metadata Cache Structure

```
┌─ Metadata Cache (localStorage) ─────────────────┐
│ Interface:                                      │
│ {                                               │
│   [sha: string]: {                              │
│     author: string;                             │
│     updatedOn: string;                          │
│     timestamp: number; // When we cached it    │
│   }                                             │
│ }                                               │
│                                                 │
│ Example:                                        │
│ {                                               │
│   "abc123def456": {                             │
│     author: "Alice Chen",                       │
│     updatedOn: "2024-01-15T10:30:00Z",         │
│     timestamp: 1705331400000                    │
│   },                                            │
│   "789ghi012jkl": {                             │
│     author: "Bob Smith",                        │
│     updatedOn: "2024-01-10T15:45:00Z",         │
│     timestamp: 1705331400000                    │
│   },                                            │
│   ... (never expires, SHA is immutable) ...    │
│ }                                               │
│                                                 │
│ Size: ~2500 entries × 100 bytes = 250KB        │
└─────────────────────────────────────────────────┘
```

### New Metadata Fetching Flow

```
Load razpisi-archive
                    ↓
    Get 2500 file entries with their SHAs
                    ↓
    For each file:
    ├─ Check metadata cache [file.sha]
    ├─ If found → use cached metadata (instant, 0 network)
    └─ If not found → add to "missing" list
                    ↓
    Result:
    ├─ 2400 entries with cached metadata (instant)
    └─ 100 entries with missing metadata (need to fetch)
                    ↓
    batchReadFileMetadata() for 100 missing files
    100 ÷ 20 = 5 queries (not 125!)
                    ↓
    Add newly fetched metadata to cache
                    ↓
    Return all 2500 entries with complete metadata
                    ↓
    🎉 Network requests: 125 → 5 (96% reduction)
```

### Combined Impact: Solutions 2 + 3C

```
First Load (Cold Cache):
├─ File structure: 1-2s
├─ Missing metadata: ~2-3s (only new entries)
├─ File content: ~2-5s
└─ Total: 5-10 seconds ✓

Second Load (Same Branch, Same Files):
├─ File structure: 1-2s (compare SHAs)
├─ Metadata: 0s (all cached, no queries!)
├─ Content: 0s (use Apollo cache)
└─ Total: 1-2 seconds ✓

Typical Update (1 file changed):
├─ File structure: 1-2s
├─ Metadata: 0.2s (1 query for 1 file)
├─ Content: 0.5s (load 1 file)
└─ Total: 2-3 seconds ✓
```

---

## Solution 1: Extended Persistent Collection Cache

### Cache Architecture

```
┌─────────────────────────────────────────────────────┐
│ Persistent Collection Cache (localStorage)           │
├─────────────────────────────────────────────────────┤
│ Key Pattern: `cache:collection:{name}`              │
│                                                      │
│ Value Structure:                                    │
│ {                                                   │
│   version: 1,                                       │
│   collection: "razpisi-archive",                    │
│   timestamp: 1705331400000,                         │
│   ttl: 86400000, // 24 hours (configurable)        │
│   collectionHash: "deadbeef...", // SHA of all     │
│   entries: [ // Full EntryValue objects            │
│     {                                               │
│       collection: "razpisi-archive",                │
│       slug: "entry-1",                              │
│       path: "content/post-1.md",                    │
│       data: { title: "...", content: "..." },      │
│       file: { path: "...", id: "..." },            │
│     },                                              │
│     ... 2499 more entries ...                       │
│   ]                                                 │
│ }                                                   │
│                                                      │
│ Size: 2500 entries × 5KB = ~12.5MB (OK)           │
└─────────────────────────────────────────────────────┘
```

### Cache Lifecycle

```
Page Load
    ↓
Check cache key: `cache:collection:razpisi-archive`
    ├─ Found?
    │  ├─ Valid (timestamp + TTL > now)?
    │  │  ├─ YES: Return cached entries immediately
    │  │  │       UI shows entries < 100ms ✓
    │  │  │       Fetch fresh data in background
    │  │  └─ Update cache if different
    │  └─ NO (expired): Fetch fresh data
    └─ Not found: Fetch fresh data
                    ↓
    Cache stored with:
    ├─ timestamp: now
    ├─ TTL: 24 hours
    ├─ collectionHash: SHA256(all entries)
    └─ entries: the loaded entries
                    ↓
    Next load within 24 hours:
    ├─ Cache hit (instant display)
    └─ Background refresh
                    ↓
    Entry is saved:
    ├─ Invalidate cache (delete key)
    └─ Force full reload on next view
```

### Invalidation Rules

```
Cache is CLEARED when:
├─ Entry created → invalidateCollectionCache(collection)
├─ Entry updated → invalidateCollectionCache(collection)
├─ Entry deleted → invalidateCollectionCache(collection)
├─ TTL expires (24h default)
├─ User logs out → clearAllCollectionCaches()
├─ Branch changes → invalidateCollectionCache(collection)
└─ Cache version increments → all old caches ignored

Cache is KEPT (safe to use) for:
├─ Navigation within same session
├─ Page reload
├─ Tab refocus
├─ Multiple concurrent tabs
└─ Offline viewing (with stale-while-revalidate)
```

---

## Solution 6: Stale-While-Revalidate Pattern

### User Experience Flow

```
Scenario: User navigates to razpisi-archive collection

Timeline:
──────────────────────────────────────────────────────

t=0ms:   User clicks "razpisi-archive"
         ├─ Check cache
         └─ Cache hit (24h TTL still valid)

t=10ms:  Display cached entries immediately!
         User sees: [post-1, post-2, ..., post-2500]
         ✓ Instant display (no loading spinner)

t=100ms: Start background sync in separate thread
         ├─ Fetch fresh file structure
         └─ Detect changes from GitHub

t=200ms: Background: Metadata check
         ├─ Most still cached (Solution 3C)
         └─ Only fetch changed entry metadata

t=500ms: Background: File content for changed entries
         ├─ Load only modified files
         └─ Continue showing old data to user

t=2000ms: Background sync complete
          ├─ Compare results with cached version
          ├─ If different:
          │  ├─ Soft-update cache
          │  ├─ Notify user "Updates available"
          │  └─ Offer refresh button
          └─ If same: silently update cache

──────────────────────────────────────────────────────

User sees list < 100ms ✓
Fresh data loaded in background ✓
No UI blocking ✓
Graceful offline support ✓
```

### Implementation Code Structure

```typescript
// pages/CollectionPage.tsx
async function loadCollection(name: string) {
  // Phase 1: Try cache first
  const cached = await getCachedEntries(name);
  if (cached) {
    setEntries(cached); // Show immediately
    setIsStale(false);
  } else {
    setIsLoading(true);
  }

  // Phase 2: Always fetch fresh (background)
  try {
    const fresh = await listAllEntriesFresh(name);
    
    // Compare with cache
    if (cached && isDifferent(cached, fresh)) {
      setIsStale(true); // Show "Updates available" banner
      setCachedEntries(fresh); // Update cache
      // User can click "Refresh" to see updates
    } else if (!cached) {
      setEntries(fresh); // Show initial result
      setCachedEntries(fresh); // Cache it
      setIsLoading(false);
    } else {
      // No changes, silently update timestamp
      setCachedEntries(fresh);
    }
  } catch (error) {
    if (!cached) {
      showError(error); // Only show error if no cache
    }
    // Otherwise, offline-mode with cached data is OK
  }
}
```

---

## Complete Solution Stack Integration

### How Solutions Work Together

```
┌──────────────────────────────────────────────────────────────┐
│ User Loads Collection                                         │
└──────────────────────────────────────────────────────────────┘
                            ↓
        ┌─────────────────────────────────────┐
        │ Solution 1: Check Persistent Cache   │
        │ (24h TTL, localStorage)              │
        └─────────────────────────────────────┘
                            ↓
            ┌───────────────┴───────────────┐
            ↓                               ↓
        CACHE HIT                      CACHE MISS
            ↓                               ↓
    Display immediately          Fetch from GitHub
    (< 100ms) ✓                            ↓
            ↓                   ┌──────────────────────────┐
    Start background         │ Solution 2: Differential │
    sync (Solution 6)        │ File Hash Tracking      │
            ↓                   └──────────────────────────┘
    Fetch fresh (async)                  ↓
            ↓                   Compare file SHAs
            │                            ↓
            │              ┌─────────────┴─────────────┐
            │              ↓                           ↓
            │         Changes detected            No changes
            │              ↓                           ↓
            ↓    ┌──────────────────────┐    Return cached entries
    ┌──────────────────┐│ Solution 3C:      │    (2500 entries)
    │ Solution 3C:     ││ Metadata Cache    │            ↓
    │ Metadata Cache   │└──────────────────┘    🎉 INSTANT
    │                  │         ↓
    │ Check cache      │  Only fetch changed
    │ for file SHAs    │  entry metadata
    │                  │  (5 queries, not 125)
    └──────────────────┘         ↓
              ↓           Load changed file content
         Load only              ↓
         missing          Update cache
         metadata      (Solution 1)
              ↓                ↓
         Merge with     Show update notification
         cached data    (Solution 6)
              ↓                ↓
         2480 unchanged    User clicks "Refresh"
         + 20 updated  (or auto-refresh on timer)
              ↓
         Update cache
         (Solution 1)
              ↓
         Refresh UI
         (Solution 6)
              ↓
         🎉 FAST UPDATE (2-5s)
```

### Performance Summary Table

```
Scenario                    Current    After Ph1    After Ph2
─────────────────────────────────────────────────────────────
Cold Load (no cache)        50-70s     5-10s        2-3s
                            ❌         ✓            ✓✓
Page Reload                 50-70s     50-70s       <1s
                            ❌         ❌           ✓✓
Typical Update (1-5 files)  50-70s     2-5s         <1s
                            ❌         ✓            ✓✓
Network Requests (files)    130        5-10         <5
                            ❌         ✓            ✓✓
First Entry Visible         ~35s       ~3s          <100ms
                            ❌         ✓            ✓✓✓
```

---

## Data Flow Diagram: Complete Solution

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interface Layer                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Collections List → User clicks "razpisi-archive"        │   │
│  │                  ↓                                        │   │
│  │  Entry List Page (shows 2500 entries)                   │   │
│  │  ├─ Instant display: cached entries                    │   │
│  │  ├─ Background: "Syncing..." indicator                 │   │
│  │  └─ Updates: "X new entries" banner (if changed)       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Layer                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Backend.listAllEntries()                               │   │
│  │  ├─ Check persistent cache (Solution 1)                │   │
│  │  ├─ Fetch diff if needed (Solution 2)                 │   │
│  │  └─ Fetch metadata (Solution 3C)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                  Cache Layers (Overlapping)                      │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Apollo Cache   │  │  Entry Cache     │  │ Metadata Ctr  │  │
│  │  (Session)      │  │  (localStorage)  │  │ (SHA-based)   │  │
│  │                 │  │                  │  │               │  │
│  │ Blob content    │  │ Full entries     │  │ Metadata by   │  │
│  │ by SHA          │  │ by collection    │  │ file SHA      │  │
│  │                 │  │ TTL: 24h         │  │               │  │
│  │ ✓ Immutable     │  │ ✓ Persistent     │  │ ✓ Immutable   │  │
│  │ ✗ Lost reload   │  │ ✓ Checked first  │  │ ✓ Persistent │  │
│  └─────────────────┘  └──────────────────┘  └───────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         Local Tree Cache (File Structure + SHAs)           │ │
│  │  ├─ Branch SHA: abc123...                                 │ │
│  │  ├─ File list: [path, id, sha] × 2500                    │ │
│  │  ├─ Compare with GitHub to detect changes                │ │
│  │  └─ Foundation for differential loading (Solution 2)     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Browser Local Storage / IndexedDB (~50MB available)       │ │
│  │  ├─ Collections cache: 12.5MB × 3 collections = 37.5MB   │ │
│  │  ├─ Metadata cache: ~500KB                               │ │
│  │  ├─ Local tree: ~100KB                                   │ │
│  │  └─ Other CMS data: ~2MB                                 │ │
│  │                                                            │ │
│  │  Total: ~40MB (OK, under 50MB limit) ✓                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Network)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GraphQL API (File structure, metadata, content)         │   │
│  │  ├─ File list query: 1-2 requests                       │   │
│  │  ├─ Metadata batch: 1-5 requests (vs 125!)              │   │
│  │  ├─ File content: batched in parallel                   │   │
│  │  └─ Apollo cache: caches by SHA                         │   │
│  │                                                           │   │
│  │  REST API (Fallback)                                     │   │
│  │  ├─ Used for nested collections (depth > 1)            │   │
│  │  ├─ More reliable than GraphQL for large requests      │   │
│  │  └─ Fallback if GraphQL fails                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub API                                │
│  ├─ GraphQL endpoint: api.github.com/graphql                   │
│  ├─ REST endpoint: api.github.com/repos/{owner}/{repo}         │
│  └─ Rate limit: 5000 points/hour (GraphQL) or 60 req/min (REST)│
└─────────────────────────────────────────────────────────────────┘
```

This architecture ensures:
- ✅ Fast initial display (cache first)
- ✅ Always gets fresh data (background sync)
- ✅ Reduced network requests (differential + caching)
- ✅ Works offline (with cached data)
- ✅ Survives page reload (persistent cache)
- ✅ Handles large collections (indexed, paginated)

