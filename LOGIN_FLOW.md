# Login Flow Documentation

## Fixed Issues

### Problem
After successful login with correct credentials, users were stuck at the login screen and kept seeing "Get Started" button repeatedly.

### Root Cause
1. **Race Condition**: After login, the redirect to `/` happened before the authentication state fully propagated
2. **Cookie Handling**: Middleware wasn't correctly reading Supabase's auth cookies
3. **Profile Loading**: Home page showed landing screen before profile data loaded

### Solutions Implemented

## 1. Updated Middleware (`middleware.ts`)
- Now correctly reads Supabase auth cookies by searching for any cookie containing `auth-token`
- Parses the JSON auth data from the cookie
- Extracts `access_token` and uses it to verify user
- Properly handles errors and redirects unauthorized users

## 2. Enhanced Login Page (`app/(auth)/login/page.tsx`)
- After successful login, fetches user's profile to determine role
- Uses `window.location.href` for hard redirect (ensures cookies are set)
- Adds 500ms delay to let auth state propagate
- Redirects based on role:
  - `SUPER_ADMIN` → `/admin`
  - `RESTAURANT` → `/dashboard`
  - `CUSTOMER` → `/`
- Better error handling and logging

## 3. Improved Home Page (`app/page.tsx`)
- Added `isRedirecting` state to prevent flash of landing page
- Uses `window.location.href` for role-based redirects
- Shows loading spinner while redirecting
- Shows "Setting up your account..." if user exists but profile is still loading
- Prevents race condition by tracking redirect state

## 4. Auto-Create Profiles (`components/providers/auth-provider.tsx`)
- If profile doesn't exist when user logs in, automatically creates one
- Falls back to creating profile with user's metadata
- Ensures every authenticated user has a profile
- Prevents login issues from missing profiles

## Login Flow

```
1. User enters email/password → Click "Sign In"
   ↓
2. Supabase authenticates → Returns session + user
   ↓
3. Login page fetches user's profile from database
   ↓
4. 500ms delay (let cookies propagate)
   ↓
5. Redirect based on role:
   - SUPER_ADMIN → /admin
   - RESTAURANT → /dashboard
   - CUSTOMER → / (home)
   ↓
6. Home page loads:
   - Shows loading spinner
   - AuthProvider loads user + profile
   - Checks role and redirects if needed:
     * SUPER_ADMIN → /admin
     * RESTAURANT → /dashboard
     * CUSTOMER → /menu
   ↓
7. User lands on their dashboard
```

## Middleware Protection

Protected routes:
- `/admin/*` - Only SUPER_ADMIN
- `/dashboard/*` - RESTAURANT and SUPER_ADMIN only
- `/profile/*` - All authenticated users

Unauthorized access redirects to:
- `/login` if not authenticated
- `/` (home) if wrong role

## Cookie Names

Supabase stores auth data in cookies with project-specific names:
- Format: `sb-<project-ref>-auth-token`
- Contains JSON with `access_token`, `refresh_token`, etc.
- Middleware dynamically finds the correct cookie

## Testing

To test the login flow:
1. Sign up with email/password
2. Trigger should auto-create profile with CUSTOMER role
3. Login redirects to `/` → then `/menu` (for customers)
4. Try accessing `/admin` → Should redirect to `/` (forbidden)
5. Try accessing `/dashboard` → Should redirect to `/` (forbidden)
6. Try accessing `/profile` → Should work (all authenticated users)

## Troubleshooting

### Still seeing "Get Started" after login?
- Check browser console for errors
- Verify profile exists in database for your user ID
- Check that cookies are being set (DevTools → Application → Cookies)
- Clear browser cache and cookies, try again

### Profile not found?
- AuthProvider will automatically create one
- Check database trigger is enabled: `on_auth_user_created`
- Manually insert profile if needed:
  ```sql
  INSERT INTO profiles (id, phone, full_name, role, wallet_balance)
  VALUES ('user-uuid', 'phone', 'name', 'CUSTOMER', 0);
  ```

### Middleware redirecting when shouldn't?
- Check cookie names in DevTools
- Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set
- Check middleware console logs for errors
