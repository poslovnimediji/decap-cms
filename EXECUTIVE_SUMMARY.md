# Executive Summary: Large Collection Optimization

## Problem

**razpisi-archive collection (2500+ entries) takes 50-70 seconds to load on initial access.**

This is unacceptable UX - users see a blank screen with spinner for over 1 minute.

## Root Causes

| # | Issue | Why | Example |
|---|-------|-----|---------|
| 1 | Always fetch all entries | No differential sync | Load all 2500 even if 1 changed |
| 2 | 125 separate metadata queries | Batch size limited to 20 | 2500 ÷ 20 = 125 requests |
| 3 | No persistent cache | Session-scoped only | Reload = start over (50-70s again) |
| 4 | Cache system disconnected | 3 caches that don't talk to each other | entry cache never used |
| 5 | No delta detection | Doesn't check what changed | Fetches unchanged entries |

## Proposed Solutions

### Quick Wins (4-5 days, 7-14x speedup)

**Solution 2 + 3C: Differential Loading + Metadata Caching**

Instead of always loading 2500 entries:
1. Compare file SHAs with GitHub → identify which changed
2. Load only changed entries (typically 10-50)
3. Cache metadata by file SHA (immutable, never expires)
4. Reuse cached entries from previous load

**Result:**
- First load: 50-70s → **5-10s**
- Typical update: 50-70s → **2-5s**
- Network requests: 125 → 1-3

### Follow-up (2-3 days, 25-35x speedup on reload)

**Solution 1 + 6: Persistent Cache + Stale-While-Revalidate**

1. Cache full collection for 24h
2. Show cached entries instantly on reload
3. Fetch fresh data in background
4. Update only if changes detected

**Result:**
- Page reload: 50-70s → **< 1 second**
- First display: **< 100ms** (from cache)

## Impact Summary

### Timeline
```
User needs collection in:   Before    After Phase 1    After Phase 2
─────────────────────────────────────────────────────────────────
"Please show me the list"   50-70s    5-10s ✓         <100ms ✓✓✓
"I'll wait a moment"        ~timeout  ✓               instantly
"Let me reload page"        50-70s    50-70s ❌       <1s ✓✓
"Check for updates"         50-70s    2-5s ✓         <1s ✓✓
```

### Metrics
```
Metric                      Current     Phase 1      Phase 2
────────────────────────────────────────────────────────
Time to 1st entry           30-50s      2-3s         <100ms
Time to full list           50-70s      5-10s        2-3s
Page reload time            50-70s      50-70s       <1s
Network requests (metadata) 125         1-5          0
Network requests (files)    ~5          ~5           ~2
Total requests              ~130        ~10          ~5
User happiness              😞          😊           😄
```

## Why This Approach

### ✅ Advantages

1. **Low Risk**
   - Uses existing infrastructure (local tree cache)
   - No API changes
   - Backward compatible
   - Fallback chains intact

2. **Works Everywhere**
   - ✓ Regular collections
   - ✓ Nested collections (depth > 1)
   - ✓ i18n collections (multiple locales)
   - ✓ Editorial workflow (drafts/published)
   - ✓ Open authoring (user forks)

3. **Incremental**
   - Phase 1 delivers immediate value (7-14x speedup)
   - Phase 2 is independent (can skip if needed)
   - Each phase tested in isolation
   - Can stop at any point

4. **Well-Tested**
   - Caching strategies proven in production systems
   - Differential sync already exists (needs enhancement)
   - Entry cache already implemented (needs integration)

### ✗ Alternatives Considered (Not Recommended)

| Alternative | Why Not |
|-------------|---------|
| Pagination | Doesn't solve first load time, confuses search |
| GraphQL Optimization | Batch size limited by GitHub API (hard limit) |
| REST API Switch | Even slower for large collections |
| Async/Streaming | Complexity without much benefit |
| Lazy-load Content | Still need metadata first (bottleneck) |

## Implementation Plan

```
Week 1: Solution 2 + 3C (Core Optimization)
├─ Extend local tree with file SHAs
├─ Implement differential detection
├─ Add metadata SHA-based caching
└─ Test: Cold load should be 5-10s

Week 2: Solution 1 (Persistent Cache)
├─ Create persistent cache layer
├─ Extend TTL to 24h
├─ Implement invalidation rules
└─ Test: Reload should be <2s

Week 3: Solution 6 (UX Polish)
├─ Implement background sync
├─ Add progress notifications
├─ Handle update scenarios
└─ Test: UX feels instant + up-to-date

Total Effort: 1 developer, 3 weeks, ~100 hours
```

## What You Need to Know

### Before Implementation

1. **Nested collections:** How deep can they go?
2. **i18n scope:** How many locales per collection?
3. **Cache TTL:** Is 24h acceptable for the use case?
4. **Device storage:** Any constraints on IndexedDB use?
5. **Offline support:** Is that a requirement?

### During Implementation

1. **Start small:** Begin with Phase 1 only
2. **Measure everything:** Track loading times continuously
3. **Test comprehensively:** All collection types, all features
4. **Communication:** Inform users of any behavior changes

### After Implementation

1. **Monitoring:** Track which users benefit most
2. **Feedback:** Ask users about perceived performance
3. **Optimization:** Tune cache sizes and TTLs
4. **Documentation:** Update CMS docs about caching

## Decision Required

**Choose one:**

### Option A: Go Ahead (Recommended)
- **When:** As soon as possible (part of next sprint)
- **Effort:** 1 developer for 3 weeks
- **Risk:** Low (proven patterns, backward compatible)
- **Payoff:** 50x+ speedup for large collections
- **Next Step:** Approve Phase 1, start implementation

### Option B: Partial (Compromise)
- **When:** Later sprint
- **Effort:** 1 developer for 1-2 weeks (Phase 1 only)
- **Risk:** Very low
- **Payoff:** 7-14x speedup (good enough?)
- **Next Step:** Plan for Phase 1, defer Phase 2

### Option C: Monitor First (Cautious)
- **When:** After measurement
- **Effort:** Observe and gather data first
- **Risk:** Collections stay slow for longer
- **Payoff:** Data-driven decision later
- **Next Step:** Add performance monitoring/logging

## Questions?

Refer to detailed investigation document: `INVESTIGATION_LARGE_COLLECTION_OPTIMIZATION.md`

For architecture details: `ARCHITECTURE_DIAGRAMS.md`

For quick reference: `OPTIMIZATION_QUICK_REFERENCE.md`

---

## Appendix: Code Quality Assurance

### Testing Coverage Required

- [ ] Unit tests: Cache logic, differential detection
- [ ] Integration tests: Full collection load with cache
- [ ] E2E tests: User workflows (load, edit, reload)
- [ ] Performance tests: Load times, network requests
- [ ] Edge cases: Large collections, updates, deletions
- [ ] Regression tests: Nested, i18n, workflow, open auth

### Code Review Checklist

- [ ] No breaking changes to public APIs
- [ ] Proper error handling and logging
- [ ] Cache invalidation rules documented
- [ ] No side effects from concurrent operations
- [ ] Performance improvements measured
- [ ] Documentation updated

### Deployment Strategy

1. Feature flag: Enable for testing group first
2. Rollout: 25% → 50% → 100% over 1 week
3. Monitor: Collection load times, error rates
4. Rollback: Plan if issues detected

---

## Success Criteria

✅ **Must Have:**
- [ ] Cold load < 10 seconds (vs 50-70s)
- [ ] Page reload < 2 seconds (vs 50-70s)
- [ ] No breaking changes
- [ ] All features still work (nested, i18n, workflow)
- [ ] Network requests reduced by 70%+

⭐ **Nice to Have:**
- [ ] Cold load < 5 seconds
- [ ] Page reload < 1 second
- [ ] Offline support
- [ ] Background sync visible to users

❌ **Never:**
- [ ] Data loss or corruption
- [ ] Inconsistent state
- [ ] Breaking existing workflows

---

**Ready to proceed? Let's optimize! 🚀**

