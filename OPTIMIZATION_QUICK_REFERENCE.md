# Large Collection Optimization: Quick Reference

## Problem Statement

**razpisi-archive collection (2500+ entries) loading time: 50-70 seconds**

This is due to:
- Always fetching ALL entries (no delta loading)
- 125 separate GraphQL queries just for metadata
- No persistent cache across page reloads
- Sequential metadata → content loading phases
- No differential sync (doesn't check what actually changed)

---

## Root Causes (Top 5)

| # | Issue | Impact | Current Code |
|---|-------|--------|--------------|
| 1 | No delta loading | Fetches 2500 entries even if 1 changed | `allEntriesByFolder()` loads all |
| 2 | 125 metadata queries | Batch size: 20 (GraphQL complexity limit) | `batchReadFileMetadata()` line 1008 |
| 3 | No persistent cache | Page reload = start over | `InMemoryCache` is session-scoped |
| 4 | Entry cache not integrated | Exists but unused | `entryCache.ts` never called |
| 5 | Local tree underutilized | Only stores file paths, not hashes | `persistLocalTree()` missing SHAs |

---

## Proposed Solutions (Ranked by Impact & Effort)

### ⭐⭐⭐ Priority 1: Granular File Hash Tracking (Solution 2)

**What:** Track file SHAs, only load changed entries

**Why:** 
- 50-70s → 5-10s on typical update (7-14x speedup)
- Uses existing local tree infrastructure
- Works with nested collections & i18n
- Low implementation risk

**Effort:** 4-5 days

**How:**
```typescript
// Extend local tree to store file SHAs
{
  head: "abc123", // branch SHA
  files: [
    {
      path: "posts/entry.md",
      sha: "def456", // FILE SHA (unchanged = no fetch)
      id: "ghi789"
    }
  ]
}

// On load: compare SHAs with remote
// Only fetch entries where SHA changed
```

---

### ⭐⭐⭐ Priority 1B: SHA-Based Metadata Caching (Solution 3C)

**What:** Cache file metadata by immutable SHA

**Why:**
- Metadata is immutable (file content = file SHA)
- 125 queries → 1-3 queries after first load
- Combines perfectly with Solution 2

**Effort:** 2-3 days

**How:**
```typescript
// Cache metadata by SHA (never changes)
interface MetadataCache {
  [sha: string]: { author: string; updatedOn: string }
}

// On load:
// - Check metadata cache for each file SHA
// - Only fetch missing metadata
// - Add new metadata to cache
```

---

### ⭐⭐ Priority 2: Extended Persistent Cache (Solution 1)

**What:** Extend entry cache from 5min → 24h, use localStorage/IndexedDB

**Why:**
- Page reload: < 2s (from cache)
- Show cached entries immediately
- Fetch fresh data in background
- 25-35x speedup on reload

**Effort:** 2-3 days

**How:**
```typescript
// On page reload:
// 1. Show cached entries immediately (< 100ms)
// 2. Fetch fresh data in background
// 3. Update cache if different
// 4. User sees instant list + updates as they arrive
```

---

### ⭐⭐ Priority 2B: Stale-While-Revalidate (Solution 6)

**What:** Serve cache while fetching fresh data

**Why:**
- Improves perceived performance dramatically
- Graceful degradation (works offline with cache)
- Better UX for large collections

**Effort:** 2-3 days

**How:**
```
User loads collection
  ↓
1. Check cache → found
2. Display cached entries immediately (User sees data!)
3. Fetch fresh data in background
4. If different, update cache + refresh UI
```

---

## Current Performance Baseline

### First Load (Cold Cache)
```
File List:     ~1-2s  (listFilesRecursive GraphQL queries)
Metadata:      ~30-50s (125 × batchReadFileMetadata queries)
Content:       ~10-20s (50 × file content batches)
─────────────────────
TOTAL:         ~50-70 SECONDS ❌
```

### Page Reload (Cache Lost)
```
Same as above: ~50-70 SECONDS ❌
```

### Differential Update (1 entry changed)
```
Same as above: ~50-70 SECONDS ❌
(Should be ~2-5s with Solution 2)
```

---

## Projected Performance (After Solutions)

### Phase 1 Only (Solutions 2 + 3C)
```
File List:     ~1-2s
Metadata:      ~1-3s  (only changed files, cached)
Content:       ~2-5s  (only changed files)
─────────────────────
COLD LOAD:     ~5-10 SECONDS ✓ (7-14x speedup)
TYPICAL UPDATE: ~2-5 SECONDS ✓
```

### After Phase 2 (+ Solutions 1 + 6)
```
Page Load:     < 1s  (from persistent cache)
Background:    ~2-3s (sync fresh data)
─────────────────────
RELOAD:        <1 SECOND ✓ (50-70x speedup)
```

---

## Implementation Roadmap

```
Week 1: Solution 2 + 3C (Granular Hash Tracking + Metadata Cache)
├─ Extend local tree with file SHAs
├─ Implement differential file detection
├─ Update allEntriesByFolder to use diff
├─ Add metadata caching layer
└─ Test: razpisi-archive should load in 5-10s ✓

Week 2: Solution 1 (Extended Persistent Cache)
├─ Create new persistentCollectionCache module
├─ Extend entry cache TTL (5min → 24h)
├─ Implement cache invalidation rules
├─ Test page reload performance ✓

Week 3: Solution 6 (Stale-While-Revalidate)
├─ Implement background sync logic
├─ Handle cache updates
├─ Add progress notifications
└─ Test: UX feels instant ✓

(Optional) Week 4: Solution 5 (IndexedDB)
├─ Migrate from localStorage to IndexedDB
├─ Better performance for large datasets
└─ Schema versioning/migration
```

---

## Key Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `packages/decap-cms-lib-util/src/implementation.ts` | Store file SHAs in local tree | Sol. 2 foundation |
| `packages/decap-cms-backend-github/src/GraphQLAPI.ts` | Add metadata caching layer | Sol. 3C |
| `packages/decap-cms-backend-github/src/implementation.tsx` | Use differential loading | Sol. 2 |
| `packages/decap-cms-core/src/lib/entryCache.ts` | Extend TTL, integrate with backend | Sol. 1 |
| `packages/decap-cms-core/src/backend.ts` | Use cache on collection load | Sol. 1 + 6 |
| **NEW:** `packages/decap-cms-core/src/lib/persistentCollectionCache.ts` | Persistent storage layer | Sol. 1 |

---

## Breaking Changes: NONE ✓

All solutions:
- ✅ Work with nested collections (depth > 1)
- ✅ Work with i18n (multiple file variants)
- ✅ Work with editorial workflow (draft branches)
- ✅ Work with open authoring (user forks)
- ✅ Maintain backward compatibility
- ✅ Have fallback chains (GraphQL → REST)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Stale cache data | Short initial TTL (24h), hash validation |
| i18n inconsistency | Test all i18n features, per-locale cache |
| Editorial workflow bugs | Never cache drafts, versioned cache |
| Memory pressure | LRU eviction, max collection size limit |
| Concurrent edits | Edit lock mechanism, skip cache during save |

---

## Success Metrics

✅ **Performance:**
- Cold load: 50-70s → 5-10s (7-14x)
- Reload: 50-70s → <1s (50-70x)
- Differential update: 50-70s → 2-5s (10-35x)

✅ **Network:**
- Metadata requests: 125 → 1-3 per load
- Total requests: ~130 → ~5 on cold cache

✅ **User Experience:**
- Instant display of list (< 1s)
- No blocking waits
- Background updates

✅ **Reliability:**
- No data loss
- All features still work
- Graceful degradation

---

## Questions to Validate

1. **For Nested Collections:** How deep can they go? Any performance constraints?
2. **For i18n:** How many locales typically? Any special ordering/grouping?
3. **For Editorial Workflow:** What happens if draft branch deleted while loading?
4. **For Cache:** What's acceptable TTL? (suggesting 24h)
5. **For Storage:** Any device/browser constraints for IndexedDB?

---

## Next Steps

If approved, recommend:

1. **Create feature branch** `feat/large-collection-optimization`
2. **Start with Phase 1** (Solutions 2 + 3C)
   - Highest impact, lowest risk
   - Can be tested in isolation
   - Immediately solves razpisi-archive problem
3. **Validate with razpisi-archive** before moving to Phase 2
4. **Document cache invalidation strategy** carefully
5. **Add telemetry** to track performance improvements

