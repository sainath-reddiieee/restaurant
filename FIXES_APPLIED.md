# Fixes Applied - 2026-01-11

## Issue 1: RLS Policy "Profile Not Found" Error

### Problem
Users were getting "profile not found" errors even after successful login. The console showed successful sign-in, but the profile couldn't be loaded.

### Root Cause
Previous migrations to fix RLS recursion removed the policy that allows users to read profiles. The final state only had:
- "Users can view own profile" policy

This was too restrictive because:
1. The policy requires checking `auth.uid() = id`
2. But to get the profile, you need to SELECT from profiles
3. The SELECT triggers the RLS policy check
4. In some cases with super admins, this created issues

### Solution Applied
Created migration `20260111194814_fix_profile_rls_properly.sql` that:

1. **Drops all conflicting policies** to start fresh
2. **Creates proper SECURITY DEFINER function** `is_super_admin()` that:
   - Bypasses RLS when checking if user is super admin
   - Prevents infinite recursion
   - Is marked as STABLE for query optimization
3. **Creates comprehensive SELECT policy** that allows:
   - Users to view their own profile (direct check, no recursion)
   - Super admins to view all profiles (via SECURITY DEFINER function)
4. **Ensures INSERT, UPDATE, DELETE policies** are properly configured

### How to Apply
Run this migration in your Supabase dashboard:

```bash
# If using Supabase CLI
supabase db push

# Or manually in SQL Editor
# Copy contents of: supabase/migrations/20260111194814_fix_profile_rls_properly.sql
```

### Verification Steps
1. Clear browser cookies and cache
2. Log in as a restaurant owner or admin
3. Check browser console - should see no RLS errors
4. Profile should load successfully
5. Dashboard should display without "profile not found" errors

---

## Issue 2: Tailwind Config Import Error

### Problem
Console showing error: `import type { Config } from 'tailwindcss';`

### Root Cause
This is likely a **build cache issue** or **TypeScript compilation error**, NOT an actual problem with the Tailwind config file. The config file is correctly formatted.

### Solutions to Try

#### Option 1: Clear Build Cache (Recommended)
```bash
# Delete build artifacts
rm -rf .next
rm -rf node_modules/.cache

# Rebuild
npm run dev
```

#### Option 2: Clear All Caches and Reinstall
```bash
# Delete everything
rm -rf .next
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# Run dev server
npm run dev
```

#### Option 3: Check TypeScript Version
The project uses TypeScript 5.2.2 and Tailwind 3.3.3, which are compatible. If the error persists, try:

```bash
# Reinstall TypeScript
npm install --save-dev typescript@5.2.2

# Run typecheck
npm run typecheck
```

#### Option 4: Verify Tailwind Config
The current config is correct, but if you want to be absolutely sure, the file should look like this:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ... theme config
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### Most Likely Fix
Simply restart your dev server:
```bash
# Stop the current dev server (Ctrl+C)
# Then restart
npm run dev
```

---

## Testing Checklist

After applying these fixes:

- [ ] RLS policies applied successfully
- [ ] Can log in as restaurant owner
- [ ] Profile loads without errors
- [ ] Dashboard displays correctly
- [ ] Can log in as super admin
- [ ] Admin can view all restaurants
- [ ] No console errors related to RLS
- [ ] Tailwind styles are working
- [ ] No TypeScript compilation errors

---

## Additional Notes

### About SECURITY DEFINER Functions
The `is_super_admin()` function uses `SECURITY DEFINER` which means:
- It runs with the privileges of the function owner (bypassing RLS)
- This is safe because it only checks the current user's role
- It prevents infinite recursion in RLS policies
- It's a standard pattern for breaking RLS recursion loops

### Why This Approach Works
1. When a user logs in, their profile needs to be fetched
2. The SELECT policy checks: "Is this your profile OR are you a super admin?"
3. For regular users: `auth.uid() = id` is checked first (no recursion)
4. For super admins: `is_super_admin()` is called
5. The function bypasses RLS to check the role
6. No infinite loop because the function doesn't trigger RLS policies

### Performance Considerations
- The `is_super_admin()` function is marked as STABLE
- This allows PostgreSQL to cache the result within a single query
- Super admin checks won't cause performance issues
- Regular users don't call the function at all (fast path)

---

**Applied by:** AI Assistant  
**Date:** 2026-01-11  
**Status:** Ready for testing
