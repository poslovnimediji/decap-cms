# Investigation: Large Collection Loading Optimization for Decap CMS

**Date:** December 8, 2025  
**Scope:** GitHub GraphQL API Implementation & Caching Strategy  
**Focus Collection:** `razpisi-archive` (2500+ entries)

---

## Executive Summary

The current implementation has **multiple layers of caching** but they work independently without optimization for large collections. The main bottlenecks for the `razpisi-archive` collection (2500+ entries) are:

1. **No delta/incremental loading** - always fetches all file metadata on initial load
2. **Apollo In-Memory Cache only** - persists only within session, resets on page reload
3. **High GraphQL query complexity** - batch metadata queries have complexity limits
4. **Sequential processing** - metadata is fetched in batches of 20, requiring multiple round-trips
5. **No differential sync** - doesn't compare local tree with remote to load only changed entries

---

## Current Architecture Overview

### 1. GraphQL API Layer (`packages/decap-cms-backend-github/src/GraphQLAPI.ts`)

**Apollo Client Configuration:**
- Uses `InMemoryCache` with intelligent cache keys (by SHA for immutable blobs/trees)
- Default fetch policy: `CACHE_FIRST` for queries
- BUT: Cache is **session-scoped** only, lost on page reload
- **Issue:** No persistent cache mechanism beyond the session

**Key Methods for Large Collections:**

#### a) `listFilesRecursive()` (Lines 585-670)
- Loads directory structure recursively using chunked processing
- Chunk size: **100 directories** at a time (configurable)
- Uses `NO_CACHE` policy for directory listings (content can change)
- **Flow:**
  1. Queues directories to process
  2. Fetches each chunk in parallel (up to 100 dirs)
  3. Extracts files and queues subdirectories
  4. Logs progress: "Processed dir: X entries"

**Performance Issues:**
- For a collection with 2500 files spread across directories, this could require many round-trips
- No caching means every load starts from scratch
- Each directory query uses full GraphQL complexity

#### b) `batchReadFileMetadata()` (Lines 987-1045)
- Fetches commit metadata (author, last update date) for files
- Batch size: **20 files per GraphQL query** (due to complexity limits)
- For 2500 entries: requires ~**125 GraphQL queries** just for metadata!
- Each query constructs variables for 20 files: `expression0, expression1, ... expression19`
- **Flow:**
  1. Split files into batches of 20
  2. For each batch, query commit history
  3. Extract author and date from first commit
  4. Return metadata array

**Performance Issues:**
- 125 network requests for metadata alone is massive
- Each request has network latency overhead
- No caching of metadata across page loads
- No differential updates (doesn't check if file was actually changed)

### 2. Backend Implementation (`packages/decap-cms-backend-github/src/implementation.tsx`)

#### a) `allEntriesByFolder()` (Lines 628-750)
- Progressive loading with `onProgress` callback
- Batch size for file loading: **50 entries at a time**
- For 2500 entries: ~**50 batches** of content reads
- **Flow:**
  1. Get file list via `listFilesRecursive()` or REST API fallback
  2. Loop through batches of 50 files
  3. Fetch metadata for batch via `batchReadFileMetadata()`
  4. Read file content in parallel (MAX_CONCURRENT_DOWNLOADS = 10)
  5. Call `onProgress` callback after each batch
  6. Return all entries

**Positive Aspects:**
- Progressive loading allows UI updates
- Semaphore limits concurrent downloads to 10
- Callback allows frontend to show progress

**Performance Issues:**
- Still requires fetching all files on every load
- Metadata fetching is separate from file content (2-phase approach)
- No smart delta detection - doesn't check what actually changed
- Falls back to REST API for nested collections (depth > 1)

#### b) `entriesByFolder()` (Lines 479-625)
- Used for paginated views
- Attempts GraphQL pagination via `listFilesPaginated()`
- Falls back to REST API + in-memory pagination if GraphQL fails

### 3. Core Backend Integration (`packages/decap-cms-core/src/backend.ts`)

#### `listAllEntries()` (Lines 667-715)
- Entry point for loading entire collection
- Calls `allEntriesByFolder()` if available
- Wraps `onProgress` to process entries before callback
- No caching layer at this level

**Missing:** No integration with the entry cache mechanism

### 4. Entry Cache Layer (`packages/decap-cms-core/src/lib/entryCache.ts`)

**Current State:**
- Exists but **NOT integrated into collection loading**
- Cache expiration: **5 minutes only** (way too short for large collections)
- Stores complete `EntryValue[]` objects
- **Location:** `packages/decap-cms-core/src/lib/entryCache.ts`

**Issue:** Not used by `listAllEntries()` or `allEntriesByFolder()`

### 5. Local Tree Caching (`packages/decap-cms-lib-util/src/implementation.ts`)

**Lower-level persistence:**
- `persistLocalTree()` stores file metadata locally with branch SHA
- Used by `allEntriesByFolder()` in `decap-cms-lib-util`
- Stores: `{ head: string, files: { id, path, name }[] }`
- Detects if local tree is stale by comparing branch SHA
- **Issue:** Only stores file paths/names, not full entry content

**Smart Differential Logic:**
```typescript
// If local tree SHA !== remote branch SHA:
//   - Calls getDiffFromLocalTree() to find changes
//   - Only processes diff (added/modified/deleted files)
// If no diff:
//   - Returns local copy without fetching
```

This is good! But it only works for the file structure, not the entry content itself.

---

## Performance Bottleneck Analysis for `razpisi-archive` (2500 entries)

### Scenario 1: First Load (Cold Cache)

**Current Flow:**
1. `listAllEntries()` → `allEntriesByFolder()`
2. Get file list: `listFilesRecursive()` 
   - **Time:** ~1-2 seconds (multiple GraphQL queries for directory tree)
3. Batch load file metadata: 2500 ÷ 20 = **~125 GraphQL queries**
   - **Time:** ~30-50 seconds (network latency dominated)
4. Load file content: 2500 files in batches of 50
   - **Time:** ~10-20 seconds (limited by concurrent downloads)
5. **Total:** ~50-70 seconds or more

**Apollo In-Memory Cache helps with:**
- Caching individual blob content by SHA (if same file is accessed twice)
- Caching branch/commit references
- **But NOT:** Full collection metadata across page reloads

### Scenario 2: Page Reload (Session Lost)

**Current Flow:**
- Apollo cache is cleared
- **Repeat entire Scenario 1: 50-70 seconds**
- Entry cache is checked but probably expired (5-minute TTL might have passed)

### Scenario 3: User Navigates Away and Returns

**Current Flow:**
- Apollo cache exists if user didn't close tab
- But entry-level cache may have expired
- **Result:** Metadata needs to be re-fetched

---

## Root Causes & Design Issues

### 1. **No Persistent Cross-Session Cache**
- Apollo `InMemoryCache` is session-scoped
- Entry cache exists but:
  - Not integrated into collection loading
  - Has 5-minute TTL (too short for large collections)
  - Stores all entries as full objects (memory intensive)
- Local tree cache exists but:
  - Only stores file paths, not content
  - Not leveraged for entry metadata

**Gap:** No persistent store of file metadata + last modified times

### 2. **No Incremental/Delta Loading**
- Always fetches complete file structure and metadata
- Even if only 1 file changed, fetches all 2500+ files
- `getDiffFromLocalTree()` exists for file structure but:
  - Not used for entry content comparison
  - Doesn't track which entries have been loaded before

**Gap:** No way to fetch only changed entries since last load

### 3. **GraphQL Query Complexity Saturation**
- Metadata batch size limited to 20 due to complexity limits
- Results in 125 requests for 2500 entries
- Could be optimized by:
  - Using GitHub's commit API differently
  - Fetching metadata in larger batches
  - Caching metadata locally instead of fetching every time

**Gap:** Batch size is artificial limit, could be improved

### 4. **Two-Phase Loading (Metadata → Content)**
- First phase: fetch metadata (125 queries)
- Second phase: fetch file content (50 sequential batches)
- Content read is blocked until metadata is ready
- Could be parallelized

**Gap:** Not pipelined or parallelized

### 5. **No Frontend Progress Optimization**
- Progress callbacks exist but frontend may not use them optimally
- UI might not show progressive loading, just wait for final result
- No estimated time remaining

**Gap:** Progress feedback loop could be better

### 6. **Missing Features for i18n & Nested Collections**
- GraphQL is disabled for nested collections (depth > 1)
- Falls back to REST API which may be even slower
- i18n entries may need special handling
- Editorial workflow entries are in separate branches

**Gap:** Optimization must not break these features

---

## Current Optimization Attempts (Already in Code)

✅ **Good Practices Found:**

1. **Chunked Directory Loading:** `listFilesRecursive()` processes in batches
2. **Batch Metadata Fetching:** `batchReadFileMetadata()` groups 20 files per query
3. **Concurrent Download Limits:** Semaphore limits to 10 concurrent file reads
4. **Progressive Loading:** `onProgress` callback for UI updates
5. **Smart Differential Sync:** `getDiffFromLocalTree()` only loads changes
6. **Fallback Chains:** GraphQL → REST API → Error handling
7. **Apollo Cache Keys:** Custom cache keys by SHA for immutability

---

## Proposed Solutions

### **Solution 1: Persistent Collection-Level Cache with Extended TTL**

**Target:** Extend cache lifetime beyond 5 minutes, make it collection-aware

**Implementation:**
1. Create new `collectionCache` module in `packages/decap-cms-core/src/lib/`
2. Store:
   ```typescript
   interface CollectionCache {
     entries: EntryValue[];
     fileHashes: { [path: string]: string }; // SHA of each file
     collectionHash: string; // Hash of all file SHAs combined
     timestamp: number;
     branchRef: string;
     version: number;
   }
   ```
3. Cache TTL: **24 hours** (configurable)
4. Invalidate on:
   - Explicit user action (create/update/delete entry)
   - Branch change detection
   - User logout

**Benefits:**
- Reloading page or navigating back shows cached entries immediately
- Full collection visible without waiting for metadata fetch
- Reduces network requests by 95% on cache hits

**Considerations:**
- Memory: 2500 entries × ~5KB per entry = ~12.5MB (acceptable)
- Storage: IndexedDB can handle 50MB+ per origin
- Stale data risk: Need smart invalidation

**Integration Points:**
- `listAllEntries()` should check cache first
- `Backend.persistEntry()` should invalidate cache
- `Implementation.deleteEntry()` should invalidate cache
- `authStore.logout()` should clear cache

---

### **Solution 2: Granular File Hash Tracking & Differential Sync**

**Target:** Load only changed/new entries, not entire collection

**Implementation:**
1. Extend local tree cache to store file hashes:
   ```typescript
   interface LocalTreeWithHashes {
     head: string; // branch SHA
     files: {
       id: string;
       path: string;
       name: string;
       sha: string; // FILE SHA for comparison
       entryHash?: string; // Cache of processed entry content hash
     }[];
   }
   ```
2. On collection load:
   - Fetch current file list (structure only, fast)
   - Compare with local tree:
     - Added files → fetch full entry
     - Deleted files → remove from cache
     - Modified files (SHA changed) → fetch full entry
     - Unchanged files → use cached entry
3. Only load metadata for modified/added files
4. Progressive update: cache updated entries as they load

**Benefits:**
- 2500-entry collection → maybe 10-50 entries actually changed
- Metadata fetch: 125 queries → 1-3 queries
- Massive latency reduction (50-70s → 2-5s on typical update)
- Works with nested collections (uses local tree mechanism already)
- Works with i18n (each i18n variant is a separate file path)

**Considerations:**
- Assumes file SHA reliably indicates content changes (it does)
- Must handle edge cases:
  - File SHA changes but content parsed same (formatting change)
  - Bulk file renames (will see as delete + add)
  - Force-push scenarios (local tree head won't exist)
- Editorial workflow entries in separate branches need special handling

**Integration Points:**
- Extend `persistLocalTree()` to store SHAs
- Modify `getDiffFromLocalTree()` to use SHA comparison
- Update `allEntriesByFolder()` to use differential loading
- Integrate with `collectionCache` from Solution 1

---

### **Solution 3: Optimized GraphQL Batch Metadata Fetching**

**Target:** Reduce 125 metadata queries to ~5-10 for large collections

**Current Limitation:**
- Batch size: 20 files (due to GraphQL complexity limits)
- Query complexity grows with number of file variables

**Approach A: Use GitHub REST API for Metadata**
- REST API: `GET /repos/{owner}/{repo}/commits?path={path}` returns only needed file
- Can fetch 60 requests/minute per user (vs GraphQL rate limits)
- Simpler queries, no complexity limits
- Trade-off: More requests but lower latency per request

**Approach B: Optimize GraphQL Query Structure**
- Use fragments more aggressively
- Fetch only fields needed (not full commit info)
- Use GitHub's `history` cursor pagination
- Increase batch size from 20 to 50-100 if possible

**Approach C: Smart Metadata Caching**
- Store metadata separately from entry content:
  ```typescript
  interface FileMetadataCache {
    [sha: string]: { author: string; updatedOn: string; timestamp: number };
  }
  ```
- Only fetch metadata for files with unknown SHA
- Metadata is immutable per SHA, can cache indefinitely
- For 2500 entries, after first load, subsequent loads need 0 metadata queries

**Recommendation:** Combine A + C
- Use REST API for metadata (simpler, more reliable)
- Cache metadata by file SHA (immutable)
- For 2500 files: ~30 REST calls, all cached after first fetch
- Fallback to GraphQL batch queries if REST fails

**Benefits:**
- Metadata phase: 125 queries → 30 REST calls → 0 on cache hit
- More reliable (REST API more stable than GraphQL)
- Works better with network interruptions (can retry single files)

**Considerations:**
- REST API vs GraphQL trade-offs (rate limits, latency)
- Must update metadata cache immediately after entry is saved
- Handle race conditions (user saves while load in progress)

---

### **Solution 4: Parallel Metadata & Content Loading**

**Target:** Reduce sequential batching, pipeline operations

**Current Flow:**
```
[Get File List] → [Metadata Batch 1] → ... → [Metadata Batch 125] → [Content Batch 1] → ... → [Content Batch 50]
```

**Optimized Flow:**
```
[Get File List] → [Metadata Batches 1-10] (in parallel)
                ↓
            [Content Batches 1-50] (overlapping with metadata)
```

**Implementation:**
1. Start file list fetch
2. As soon as first batch of files arrives, start metadata fetch
3. As soon as metadata arrives, start content fetch
4. Use queue system to pipeline batches
5. Don't wait for all metadata before starting content loads

**Benefits:**
- Overlapping I/O reduces total time
- First entries appear faster (better UX)
- More efficient use of network bandwidth

**Considerations:**
- Requires careful coordination (race conditions)
- Frontend progress callback becomes more complex
- Error handling more intricate

---

### **Solution 5: Implement IndexedDB-Based Persistent Cache**

**Target:** Persist not just metadata, but full entry content

**Implementation:**
1. Use IndexedDB for larger storage capacity (~50MB per origin)
2. Structure:
   ```typescript
   interface PersistedEntry {
     id: string; // collection:slug
     collection: string;
     path: string;
     slug: string;
     data: string; // raw entry content
     metadata: { author: string; updatedOn: string };
     contentHash: string; // SHA256 of data
     timestamp: number;
     collectionHash: string; // part of larger collection hash
   }
   ```
3. Index by:
   - `collection + timestamp` (for TTL expiration)
   - `path` (for direct lookups)
   - `contentHash` (for deduplication)

4. Cache invalidation:
   - TTL: 7 days (configurable)
   - On entry change: update specific entry
   - On branch change: mark all for invalidation
   - On user logout: clear all

**Benefits:**
- Survives browser restart
- Full entry content cached (no metadata fetch needed)
- Can serve entries while checking for updates
- Stale-while-revalidate pattern: serve cache, fetch updates in background

**Considerations:**
- IndexedDB is async (performance implications)
- Need careful data structure for size efficiency
- Must handle schema migrations
- Storage limits on some browsers/devices

---

### **Solution 6: Background Sync & Stale-While-Revalidate Pattern**

**Target:** Improve perceived performance by serving stale data while fetching fresh

**Implementation:**
1. On collection load:
   - Check persistent cache (Solution 5)
   - If valid cache exists (< 7 days):
     - Return cached entries immediately
     - Fetch fresh data in background
     - Update cache when fresh data arrives
     - Notify user if significant changes
   - If no cache or expired:
     - Fetch fresh data (show loading state)

2. For large collections specifically:
   ```typescript
   async function listAllEntriesOptimized(collection) {
     // Try cache first
     const cached = await getCachedEntries(collection);
     if (cached) {
       onEntriesLoaded(cached); // Show immediately
       // In background:
       try {
         const fresh = await listAllEntriesFresh(collection);
         if (isDifferent(cached, fresh)) {
           updateCache(fresh);
           onEntriesUpdated(fresh); // Refresh UI if needed
         }
       } catch (e) {
         console.warn('Background sync failed, using cache');
       }
     } else {
       // No cache, fetch fresh
       const fresh = await listAllEntriesFresh(collection);
       await setCachedEntries(fresh);
       onEntriesLoaded(fresh);
     }
   }
   ```

**Benefits:**
- Instant display of entries (from cache)
- Still gets fresh data in background
- Perceived performance dramatically improved
- Graceful degradation if network fails

**Considerations:**
- User might see stale data initially (acceptable for read-only views)
- Need conflict resolution if user edits while sync happening
- Background sync should not interfere with edits
- Progressive updates might confuse users (needs careful UX)

---

### **Solution 7: Smart Collection Metadata Index**

**Target:** Create lightweight index of collection structure for quick navigation

**Implementation:**
1. Separate concerns:
   - **Index**: path, slug, modified date, author (lightweight, ~100 bytes per entry)
   - **Content**: full entry data (~5KB per entry, lazy-loaded)

2. Index stored in persistent cache:
   ```typescript
   interface CollectionIndex {
     collection: string;
     entries: {
       slug: string;
       path: string;
       title?: string; // inferred from content
       author: string;
       updatedOn: string;
     }[];
     timestamp: number;
     contentHash: string;
   }
   ```

3. Usage:
   - Display list view: use index (fast, minimal data)
   - Open entry editor: lazy-load full content
   - Search: search within index, load matching entries on demand
   - Sort: sort index in-memory

**Benefits:**
- List views load instantly (just index)
- Reduces memory footprint (index ~250KB for 2500 entries vs 12.5MB for full content)
- Searching much faster (in-memory, no network)
- Pagination becomes trivial (slice index)
- Better mobile performance

**Considerations:**
- Index must be updated when entries change
- Inferred fields (title) may not match actual content (need refresh)
- Preview/summary still requires content fetch
- Must handle i18n (each variant is separate index entry)

---

## Compatibility & Constraints

### Must NOT Break:

1. **Nested Collections** (depth > 1)
   - Currently use REST API fallback
   - Caching must work with any depth
   - Differential sync must handle nested structures

2. **i18n Collections**
   - Each locale is separate file
   - Cache must handle multiple files per logical entry
   - Grouping logic must remain intact
   - Deletions must work across all locales

3. **Editorial Workflow**
   - Draft entries in CMS branches (`cms/` prefix)
   - Must not cache PR metadata
   - Draft/published state must be accurate
   - Publishing workflow must be reliable

4. **Open Authoring**
   - User's fork vs origin repo
   - Different branches for different users
   - Cache must be per-branch aware

5. **Multiple Backends**
   - GitHub GraphQL-specific optimizations must not break REST API fallback
   - GitLab, Bitbucket, etc. must not be affected
   - Backend abstraction must remain clean

---

## Recommendation Priority

### **Phase 1 (High Impact, Lower Risk):**

1. **Solution 2: Granular File Hash Tracking** ⭐⭐⭐
   - Uses existing local tree infrastructure
   - Only loads changed entries
   - Estimated speedup: 50-70s → 5-10s on typical update
   - Low complexity, well-defined scope
   - Works with all collection types
   - Minimal breaking risk

2. **Solution 3C: SHA-Based Metadata Caching** ⭐⭐⭐
   - Metadata is immutable per file SHA
   - Can cache indefinitely
   - Combines with Solution 2 nicely
   - Reduces metadata queries to near-zero on repeat loads
   - 1-2 days implementation

### **Phase 2 (High Impact, Moderate Risk):**

3. **Solution 1: Extended Persistent Collection Cache** ⭐⭐
   - Extends existing entry cache (5min → 24h)
   - Provides instant display on page reload
   - Easier than IndexedDB implementation
   - 3-5 days implementation
   - Must handle invalidation carefully

4. **Solution 6: Stale-While-Revalidate** ⭐⭐
   - Improves perceived performance
   - Requires cache from Solution 5
   - Careful UX considerations
   - 2-3 days implementation

### **Phase 3 (High Impact, Higher Risk):**

5. **Solution 5: IndexedDB Persistent Cache** ⭐
   - Full entry persistence
   - Better than localStorage
   - More complex implementation
   - Schema migration needed
   - 4-6 days implementation

6. **Solution 7: Smart Collection Metadata Index** ⭐
   - Optimizes list/search views
   - Requires UI changes to lazy-load content
   - Medium complexity
   - Good for very large collections
   - 3-5 days implementation

### **Low Priority (Nice to Have):**

7. **Solution 4: Parallel Metadata & Content Loading**
   - Incremental improvement over Solution 2
   - Complex coordination
   - Estimated 20% additional speedup
   - High risk of race conditions
   - 5-7 days implementation

---

## Testing & Validation Strategy

### Key Metrics to Track:

1. **Time to First Entry Display**
   - Current: ~30-50 seconds (wait for metadata)
   - Target: < 5 seconds

2. **Time to Full Collection Load**
   - Current: ~50-70 seconds
   - Target: 10-15 seconds (cold cache), < 2 seconds (warm cache)

3. **Page Reload Time**
   - Current: 50-70 seconds
   - Target: < 2 seconds (from cache)

4. **Network Requests Count**
   - Current: ~130 requests (125 metadata + file structure)
   - Target: < 5 requests on cache hit

5. **Memory Usage**
   - Should not exceed 50MB for 2500-entry collection
   - IndexedDB size monitoring

### Test Scenarios:

1. **Cold Cache (First Load)**
   - Clear cache, load collection
   - Measure time for each phase
   - Monitor network requests

2. **Warm Cache (Repeat Load)**
   - Reload page without clearing cache
   - Should be near-instant
   - Verify cache is being used

3. **Differential Update**
   - Load collection
   - Modify 1 entry in another window
   - Reload: should only fetch that entry
   - Measure network requests

4. **i18n Collections**
   - Load collection with 3 locales
   - Verify all variants cached
   - Verify all loaded correctly

5. **Nested Collections**
   - Load nested collection (depth > 1)
   - Verify works with caching
   - Compare GraphQL vs REST performance

6. **Editorial Workflow**
   - Create draft entry
   - Verify not cached (drafts are transient)
   - Publish entry
   - Verify cache updated

7. **Large Collection (5000+ entries)**
   - Stress test with razpisi-archive or mock data
   - Memory monitoring
   - Browser stability

---

## Implementation Order Recommendation

```
┌─────────────────────────────────────────┐
│ 1. File Hash Tracking (Solution 2)     │ ← Start here
│    + Metadata Caching (Solution 3C)     │   Core optimization
│    Estimated: 4-5 days                  │
└─────────────────────────────────────────┘
                   ↓
        ✓ Test with razpisi-archive
        ✓ Measure 50-70s → 5-10s speedup
        ✓ Verify nested/i18n/workflow still work
                   ↓
┌─────────────────────────────────────────┐
│ 2. Extended Collection Cache (Sol. 1)  │
│    Persistent 24h TTL                   │
│    Estimated: 2-3 days                  │
└─────────────────────────────────────────┘
                   ↓
        ✓ Test page reload performance
        ✓ Verify cache invalidation
                   ↓
┌─────────────────────────────────────────┐
│ 3. Stale-While-Revalidate (Solution 6)  │
│    Background sync pattern              │
│    Estimated: 2-3 days                  │
└─────────────────────────────────────────┘
                   ↓
        ✓ Test perceived performance
        ✓ Test UX for cache updates
                   ↓
┌─────────────────────────────────────────┐
│ 4. IndexedDB Cache (Solution 5)         │
│    Full persistence, optional           │
│    Estimated: 4-6 days (if needed)      │
└─────────────────────────────────────────┘
```

---

## Estimated Improvements

### For `razpisi-archive` (2500 entries):

| Metric | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|--------|---------|---------------|---------------|---------------|
| **Cold Load** | 50-70s | 5-10s | 2-3s | 2-3s |
| **Page Reload** | 50-70s | 50-70s | <1s | <1s |
| **Differential Update** | 50-70s | 2-5s | <1s | <1s |
| **Network Requests** | ~130 | ~5 | ~2 | ~0 |
| **Cache Hit Rate** | 0% | 20% | 80% | 95%+ |

---

## Risk Assessment

### High Risk Items:

1. **Cache Invalidation Bugs**
   - Stale data visible to users
   - Mitigation: Comprehensive test suite, short TTL initially
   - Solution: Use collection hash to detect staleness

2. **i18n Complexity**
   - Different files for different locales
   - Mitigation: Thorough testing of all i18n features
   - Solution: Ensure cache key includes locale info

3. **Editorial Workflow Edge Cases**
   - Draft/published sync with cache
   - Mitigation: Never cache draft entries, only published
   - Solution: Separate caches for drafts vs published

### Medium Risk Items:

1. **Memory Pressure on Large Collections**
   - Multiple large collections loaded
   - Mitigation: Implement LRU eviction, size limits
   - Solution: Monitor memory, clear old caches

2. **Concurrent Edits**
   - User edits while background sync running
   - Mitigation: Lock mechanism for in-progress edits
   - Solution: Disable cache updates during edit

### Low Risk Items:

1. **Browser Compatibility**
   - IndexedDB support varies
   - Mitigation: Feature detection, graceful fallback
   - Solution: Rest API works without caching

---

## Conclusion

The `razpisi-archive` collection's slow loading is **not due to a single bottleneck** but rather the **cumulative effect of multiple suboptimal design choices**:

1. **No differential loading** (load all 2500 every time)
2. **No persistent cache** (lose everything on page reload)
3. **Sequential metadata fetching** (125 separate queries)
4. **No content caching** (fetch again on next page load)

**Solutions 2 & 3 combined** would provide the **quickest wins**:
- Phase 1 gets us from 50-70s → 5-10s (7-14x speedup)
- Uses existing infrastructure (local tree caching)
- Low risk of breaking nested/i18n/workflow
- Can be implemented in 4-5 days

**Solutions 1 & 6 would complete the optimization**:
- Phase 2 gets us to < 2s on repeat loads (25-35x speedup on reload)
- Makes experience feel instant for regular users

**The solutions are mutually compatible** and can be implemented incrementally with validation at each phase.

