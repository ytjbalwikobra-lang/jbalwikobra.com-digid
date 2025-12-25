# 📊 Performance Monitoring Guide
**Last Updated:** December 25, 2024  
**Purpose:** Track system performance and identify optimization opportunities

---

## 🎯 Key Metrics to Monitor

### 1. Supabase Egress
**Target:** < 35% of pre-optimization baseline  
**Current:** ~30-35% (65-70% reduction achieved)

**How to Monitor:**
1. Go to Supabase Dashboard → Project Settings → Usage
2. Check "Database Egress" chart
3. Compare week-over-week trends

**Warning Signs:**
- Sudden spike in egress (>50% increase)
- Gradual upward trend over multiple weeks
- Egress > 10GB/day (depends on traffic)

**Action Items:**
```bash
# Check for new select('*') queries
cd /home/runner/work/jbalwikobra.com-digid/jbalwikobra.com-digid
grep -r "select('\*')" src/ api/ --include="*.ts"

# Should return 2 or fewer results
```

---

### 2. API Response Times
**Target:** 
- < 200ms for cached endpoints
- < 500ms for database queries
- < 1000ms for complex operations

**How to Monitor:**
1. Vercel Dashboard → Analytics → Performance
2. Check "p50", "p75", "p95" response times
3. Identify slow endpoints

**Warning Signs:**
- p95 > 2000ms consistently
- Specific endpoints > 3000ms
- Increasing trends week-over-week

**Action Items:**
```typescript
// Add timing logs to slow endpoints
console.time('operation-name');
// ... operation code ...
console.timeEnd('operation-name');
```

---

### 3. Cache Hit Rate
**Target:** > 60% hit rate for cacheable endpoints

**How to Monitor:**
```bash
# Check Vercel logs for cache headers
vercel logs --follow | grep "Cache-Control"

# Look for X-Vercel-Cache: HIT vs MISS
```

**Warning Signs:**
- Hit rate < 40%
- Many MISS on supposedly cached endpoints
- Stale cache serving old data

**Action Items:**
- Review cache TTLs in `api/_utils/cacheControl.ts`
- Adjust based on data update frequency
- Consider increasing TTL for static data

---

### 4. Error Rates
**Target:** < 1% error rate

**How to Monitor:**
1. Vercel Dashboard → Logs
2. Filter by "error" or status codes 500-599
3. Check Sentry/error tracking if configured

**Warning Signs:**
- Error rate > 2%
- Specific endpoint failing repeatedly
- Database connection errors

**Common Errors to Watch:**
```typescript
// PGRST116 - Not found (expected, not critical)
// Connection timeout - Database overload
// RLS violation - Permission issue
// Xendit webhook failures - Payment issues
```

---

### 5. Database Query Performance
**Target:** 
- Simple queries < 50ms
- Complex queries < 200ms
- Joins < 500ms

**How to Monitor:**
```sql
-- In Supabase SQL Editor
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 200
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Warning Signs:**
- Queries > 1000ms regularly
- High number of calls to slow queries
- Sequential scans on large tables

**Action Items:**
1. Add indexes to frequently filtered columns
2. Optimize query with explicit field selection
3. Consider materialized views for complex aggregations

---

## 📈 Weekly Review Checklist

### Every Monday Morning
- [ ] Check Supabase egress vs previous week
- [ ] Review Vercel analytics for slow endpoints
- [ ] Check error rate and investigate top errors
- [ ] Review cache hit rates
- [ ] Run security audit: `npm audit`

### Monthly Deep Dive
- [ ] Analyze top 10 slowest API endpoints
- [ ] Review database query performance
- [ ] Check for new `select('*')` queries
- [ ] Update dependencies: `npm outdated`
- [ ] Review test coverage: `npm test -- --coverage`

---

## 🚨 Alert Thresholds

Set up alerts (in Vercel/Supabase) for:

| Metric | Warning | Critical |
|--------|---------|----------|
| Egress | > 40% baseline | > 60% baseline |
| API p95 | > 1500ms | > 3000ms |
| Error Rate | > 2% | > 5% |
| Database CPU | > 70% | > 90% |
| Cache Hit Rate | < 50% | < 30% |

---

## 🔧 Performance Optimization Workflow

When performance degrades:

1. **Identify the Problem**
   ```bash
   # Check recent deploys
   vercel ls --limit 10
   
   # Check recent commits
   git log --oneline -20
   ```

2. **Isolate the Cause**
   - Compare metrics before/after recent deploy
   - Check if specific endpoint is slow
   - Review database query logs

3. **Apply Fix**
   - Optimize slow query
   - Add caching
   - Add pagination
   - Scale up resources (if needed)

4. **Verify Improvement**
   - Monitor for 24-48 hours
   - Compare metrics
   - Document the fix

---

## 📊 Performance Dashboards

### Recommended Tools

**1. Supabase Dashboard**
- Database usage and performance
- Query analytics
- Real-time connections

**2. Vercel Analytics**
- Response times (p50, p75, p95)
- Error rates
- Geographic distribution

**3. Custom Dashboard (Optional)**
```typescript
// Create a simple performance dashboard page
// src/pages/admin/Performance.tsx

import { useEffect, useState } from 'react';

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState({
    responseTime: 0,
    errorRate: 0,
    cacheHitRate: 0,
  });

  // Fetch metrics from your monitoring service
  useEffect(() => {
    // Implementation here
  }, []);

  return (
    <div>
      <h1>Performance Metrics</h1>
      <MetricCard title="Avg Response Time" value={metrics.responseTime} />
      <MetricCard title="Error Rate" value={metrics.errorRate} />
      <MetricCard title="Cache Hit Rate" value={metrics.cacheHitRate} />
    </div>
  );
}
```

---

## 🎓 Best Practices

### 1. Always Test Performance Changes
```bash
# Before optimization
ab -n 1000 -c 10 https://your-api.com/endpoint

# After optimization
ab -n 1000 -c 10 https://your-api.com/endpoint

# Compare results
```

### 2. Document All Optimizations
- Record baseline metrics
- Document what changed
- Note expected improvement
- Verify actual improvement

### 3. Incremental Improvements
- Don't optimize everything at once
- One change per deploy
- Easier to identify what works

### 4. Monitor for Regressions
- Set up automated performance tests
- Alert on degradations
- Roll back if needed

---

## 📝 Performance Audit Template

Use this template for quarterly performance audits:

```markdown
# Performance Audit - Q[X] 2024

## Metrics Summary
- Supabase Egress: X GB (Y% change from last quarter)
- Average Response Time: X ms (Y% change)
- Error Rate: X% (Y% change)
- Cache Hit Rate: X% (Y% change)

## Top Issues Identified
1. [Issue description]
   - Impact: [High/Medium/Low]
   - Action: [What needs to be done]

## Optimizations Completed
1. [Optimization description]
   - Impact: [Measured improvement]
   - Date: [When deployed]

## Next Quarter Goals
1. [Goal 1]
2. [Goal 2]
3. [Goal 3]
```

---

## 🔗 Useful Commands

```bash
# Check current query count
grep -r "select('\*')" src/ api/ --include="*.ts" | wc -l

# Find slow database queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Analyze bundle size
npm run build --report

# Run performance tests
npm test -- --coverage

# Check for security issues
npm audit

# Update dependencies
npm outdated
npm update
```

---

## 📞 When to Escalate

Contact technical lead if:
- Egress > 2x baseline for > 24 hours
- Critical endpoint down for > 5 minutes
- Error rate > 10%
- Database CPU > 95% sustained
- Unable to identify performance issue root cause

---

**Last Review:** December 25, 2024  
**Next Review:** January 25, 2025  
**Owner:** Development Team
