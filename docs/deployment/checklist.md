# 🚀 Deployment Checklist
**Purpose:** Ensure safe and successful deployments to production

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing: `npm test`
- [ ] TypeScript compilation successful: `npm run tsc`
- [ ] Linting passes (if configured): `npm run lint`
- [ ] No console.log statements in production code (except intentional logging)
- [ ] Code reviewed by at least one other developer
- [ ] Branch up to date with main/master

### Performance
- [ ] No new `select('*')` queries added
- [ ] Large queries use pagination
- [ ] API endpoints have appropriate caching headers
- [ ] Images optimized (if any added)
- [ ] Bundle size checked (no unexpected increases)

### Security
- [ ] No secrets in code (check environment variables)
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Authentication/authorization properly implemented
- [ ] Input validation in place for new endpoints
- [ ] CORS configured correctly

### Database
- [ ] Database migrations tested in staging
- [ ] RLS policies reviewed (if changed)
- [ ] Indexes added for new queries
- [ ] Backup created before migration
- [ ] Rollback plan documented

### Environment Variables
- [ ] All required env vars documented
- [ ] Env vars added to Vercel dashboard
- [ ] No sensitive data in public env vars
- [ ] .env.example updated

### Documentation
- [ ] README updated (if needed)
- [ ] API changes documented
- [ ] Migration guide created (if breaking changes)
- [ ] Changelog updated

---

## Deployment Steps

### 1. Staging Deployment
```bash
# Deploy to staging first
vercel --prod=false

# Test in staging
# - Smoke test critical flows
# - Test new features
# - Check performance
# - Verify database migrations
```

### 2. Staging Validation
- [ ] Homepage loads correctly
- [ ] User login works
- [ ] Product catalog displays
- [ ] Checkout flow completes
- [ ] Admin dashboard accessible
- [ ] Payment webhooks processing
- [ ] API endpoints responding < 1s

### 3. Production Deployment
```bash
# Deploy to production
vercel --prod

# Or via git (if auto-deploy enabled)
git push origin main
```

### 4. Post-Deployment Validation
**Immediate (0-5 minutes):**
- [ ] Homepage loads
- [ ] No 500 errors in logs
- [ ] Database connections healthy
- [ ] Vercel build successful

**Short-term (5-30 minutes):**
- [ ] Monitor error rates in Vercel logs
- [ ] Check Supabase for unusual activity
- [ ] Test critical user flows
- [ ] Verify new features work
- [ ] Check payment processing

**Medium-term (30 minutes - 2 hours):**
- [ ] Monitor performance metrics
- [ ] Check for error spikes
- [ ] Review user feedback/support tickets
- [ ] Verify background jobs running

---

## Rollback Plan

### If Issues Detected:

**Option 1: Quick Rollback (Vercel)**
```bash
# List recent deployments
vercel ls

# Promote previous deployment
vercel promote [deployment-url]
```

**Option 2: Git Revert**
```bash
# Revert the commit
git revert HEAD

# Push to trigger redeploy
git push origin main
```

**Option 3: Hotfix**
```bash
# Create hotfix branch
git checkout -b hotfix/issue-name

# Make fix
# ... make changes ...

# Deploy
git push origin hotfix/issue-name
vercel --prod
```

---

## Critical Deployment Scenarios

### Database Migration Deployment

**Before:**
1. Backup database
2. Test migration in staging
3. Prepare rollback script
4. Schedule during low-traffic time

**During:**
```bash
# Run migration
npm run migrate:up

# Verify migration
psql -c "SELECT * FROM schema_migrations;"
```

**After:**
1. Verify data integrity
2. Check application logs
3. Test affected features
4. Monitor for 24 hours

### Breaking API Changes

**Before:**
1. Version API endpoints (e.g., `/api/v2/products`)
2. Support old version temporarily
3. Communicate changes to API consumers
4. Document migration path

**During:**
1. Deploy new version alongside old
2. Monitor usage of both versions
3. Gradually migrate traffic

**After:**
1. Monitor error rates
2. Deprecate old version after grace period
3. Remove old version in next major release

---

## Emergency Procedures

### Site Down (500 Errors)
1. Check Vercel status page
2. Check Supabase status
3. Review recent deployments
4. Check error logs
5. Rollback if recent deploy caused issue
6. Contact support if infrastructure issue

### Database Connection Issues
1. Check Supabase dashboard
2. Verify connection pool limits
3. Check for long-running queries
4. Restart pooler if needed
5. Scale up if resource constrained

### Payment Processing Failure
1. Check Xendit dashboard
2. Verify webhook endpoint responding
3. Check payment logs
4. Manually process failed payments
5. Communicate with affected customers

---

## Post-Deployment Communication

### Internal Team
```markdown
## Deployment Complete: [Feature/Fix Name]

**Deployed:** [Date/Time]
**Version:** [Version Number]
**Changes:**
- [Change 1]
- [Change 2]

**Known Issues:** [None or list issues]
**Monitoring:** [Links to dashboards]
```

### Customer Communication (if needed)
```markdown
Subject: System Update - [Brief Description]

We've deployed an update that includes:
- [User-facing change 1]
- [User-facing change 2]

No action required from your end.
```

---

## Deployment Frequency Recommendations

- **Hotfixes:** As needed (test thoroughly even if urgent)
- **Minor updates:** 1-2 times per week
- **Major features:** Every 2-4 weeks
- **Database migrations:** During low-traffic hours

---

## Monitoring After Deployment

### First 24 Hours
- [ ] Check error rates every hour
- [ ] Monitor performance metrics
- [ ] Review user feedback
- [ ] Check for unusual patterns

### First Week
- [ ] Daily performance review
- [ ] Track key metrics vs baseline
- [ ] Address any issues promptly
- [ ] Gather user feedback

---

## Deployment Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Deployment Success Rate | > 95% | < 90% |
| Rollback Rate | < 5% | > 10% |
| Time to Deploy | < 10 min | > 30 min |
| Post-Deploy Issues | < 2 per deploy | > 5 per deploy |
| MTTR (Mean Time to Recover) | < 30 min | > 2 hours |

---

## Tools & Resources

**Deployment:**
- Vercel Dashboard: https://vercel.com/dashboard
- Vercel CLI: `npm i -g vercel`

**Monitoring:**
- Vercel Analytics
- Supabase Dashboard
- Browser DevTools

**Communication:**
- Slack/Discord for team updates
- Status page for customer communication

---

## Lessons Learned Log

Document issues encountered during deployments:

```markdown
### [Date] - [Issue Title]

**Problem:** [Description]
**Root Cause:** [What caused it]
**Solution:** [How it was fixed]
**Prevention:** [How to prevent in future]
**Time to Resolve:** [Duration]
```

---

## Deployment Approval (for Production)

**Required Approvals:**
- [ ] Tech Lead reviewed code
- [ ] QA tested in staging
- [ ] Product Manager approved (for features)
- [ ] Security reviewed (for security changes)

**Sign-off:**
- Developer: _______________
- Reviewer: _______________
- Date: _______________

---

**Last Updated:** December 25, 2024  
**Next Review:** Monthly  
**Owner:** DevOps/Engineering Team
