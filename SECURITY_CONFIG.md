# Security Configuration Guide

This document outlines manual security configurations that need to be applied in the Supabase Dashboard.

## ✅ Completed Automatically

The following security improvements have been applied via database migrations:

- **Removed Unused Indexes**: Cleaned up 3 unused indexes to reduce storage overhead
- **Consolidated RLS Policies**: Replaced multiple permissive policies with single comprehensive policies per action
- **Improved Policy Clarity**: Each table now has one clear policy per action, reducing risk of unintended access

## ⚠️ Manual Configuration Required

The following configurations cannot be automated and must be set manually in the Supabase Dashboard:

### 1. Auth DB Connection Strategy

**Issue**: Your Auth server uses a fixed number of connections (10). This doesn't scale with instance size changes.

**Solution**:
1. Go to **Supabase Dashboard** > **Database** > **Settings**
2. Find the **Connection Pooling** section
3. Switch from **Fixed Number** to **Percentage-Based** allocation
4. This ensures connection pooling scales automatically with your database instance

**Benefits**:
- Better resource utilization
- Automatic scaling with instance upgrades
- Improved Auth server performance

---

### 2. Leaked Password Protection

**Issue**: Password breach detection is currently disabled.

**Solution**:
1. Go to **Supabase Dashboard** > **Authentication** > **Policies**
2. Find **Leaked Password Protection** setting
3. Enable **Check passwords against HaveIBeenPwned.org**
4. Save changes

**Benefits**:
- Prevents users from using compromised passwords
- Protects against credential stuffing attacks
- Improves overall account security
- No performance impact (checked only during password set/change)

---

## Security Best Practices Applied

### Row Level Security (RLS)
✅ All tables have RLS enabled
✅ Policies follow principle of least privilege
✅ Role-based access control implemented:
  - **SUPER_ADMIN**: Full platform access
  - **RESTAURANT**: Own restaurant data only
  - **CUSTOMER**: Own orders and active restaurant data only

### Policy Structure
✅ Single comprehensive policy per action per table
✅ Clear separation of concerns
✅ Efficient policy evaluation
✅ No redundant or conflicting policies

### Data Protection
✅ Customers can only view their own orders
✅ Restaurant owners can only manage their own data
✅ Super admins have audit access to all data
✅ Public can only view active restaurants and available menu items

---

## Verification Checklist

After applying manual configurations, verify:

- [ ] Auth connection pooling is set to percentage-based
- [ ] Leaked password protection is enabled
- [ ] Test login with a known compromised password (should be rejected)
- [ ] Test role-based access for each user type
- [ ] Verify restaurant owners can only see their own data
- [ ] Verify customers can only see their own orders

---

## Additional Recommendations

1. **Monitor Database Performance**: Check query performance after policy changes
2. **Review Auth Logs**: Monitor failed login attempts and suspicious activity
3. **Regular Security Audits**: Review policies quarterly for any needed updates
4. **Keep Dependencies Updated**: Regularly update Supabase client libraries
5. **Enable MFA**: Consider enabling multi-factor authentication for admin accounts

---

For questions or issues, refer to [Supabase Security Documentation](https://supabase.com/docs/guides/auth/auth-helpers/security).
