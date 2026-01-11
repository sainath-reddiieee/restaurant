# Test Accounts Setup Guide

## Your Existing Account

You already have a **SUPER_ADMIN** account in the database:

- **Email:** `psainath123@gmail.com`
- **Role:** SUPER_ADMIN (Admin Panel Access)
- **Name:** sain
- **Phone:** 9441414140

### To Login:

1. Go to `/login` page
2. Enter your email: `psainath123@gmail.com`
3. Enter your password (the one you used when signing up)
4. Click "Sign In"
5. You'll be redirected to `/admin` (Admin Panel)

---

## If You Forgot Your Password

### Option 1: Reset Password (Recommended)

1. Go to `/login`
2. Click "Forgot password?"
3. Enter: `psainath123@gmail.com`
4. Click "Send Reset Link"
5. Check your email inbox
6. Click the reset link
7. Set a new password
8. Return to login page and sign in

### Option 2: Create New Password via Supabase Dashboard

1. Open Supabase Dashboard
2. Go to Authentication → Users
3. Find your user (psainath123@gmail.com)
4. Click "Reset Password" or "Send Password Reset Email"

---

## Creating Test Accounts for Different Roles

Since Supabase Auth requires email confirmation to be disabled or proper signup flow, here's how to create test accounts:

### Method 1: Via Login Page (Sign Up)

#### For Restaurant Owner Account:

1. Go to `/login`
2. Click "Create Account" tab
3. Fill in:
   - **Email:** `restaurant@test.com`
   - **Password:** `Test123456`
   - **Full Name:** Test Restaurant Owner
   - **Phone:** 9876543210
4. Click "Create Account"
5. **Important:** After signup, you need to manually update the role in the database

#### For Customer Account:

1. Go to `/login`
2. Click "Create Account" tab
3. Fill in:
   - **Email:** `customer@test.com`
   - **Password:** `Test123456`
   - **Full Name:** Test Customer
   - **Phone:** 9876543211
4. Click "Create Account"
5. By default, new accounts are created with CUSTOMER role

### Method 2: Via SQL (Direct Database)

Run these queries in your Supabase SQL Editor:

```sql
-- After creating user via signup, update their role to RESTAURANT
UPDATE profiles
SET role = 'RESTAURANT'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'restaurant@test.com'
);

-- For customer (default is CUSTOMER, so no need to update)
-- But if needed:
UPDATE profiles
SET role = 'CUSTOMER'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'customer@test.com'
);
```

---

## Quick Test Account Creation Script

I'll create a helper page for you at `/create-test-accounts` that will make this easier!

---

## Testing Different Roles

### 1. Test as Admin (SUPER_ADMIN)

**Login at:** `/login` or `/partner`

**Credentials:**
- Email: `psainath123@gmail.com`
- Password: (your password)

**Access:**
- Admin Panel: `/admin`
- View all restaurants
- Manage system-wide settings
- View all orders and analytics

---

### 2. Test as Restaurant Owner (RESTAURANT)

**Login at:** `/partner`

**Credentials:** (after creating)
- Email: `restaurant@test.com`
- Password: `Test123456`

**Access:**
- Restaurant Dashboard: `/dashboard`
- Manage menu items
- View orders
- Set up loot deals
- Manage coupons

---

### 3. Test as Customer (CUSTOMER)

**Login:** Not required for browsing!

**Flow:**
1. Browse restaurants at `/` (no login needed)
2. Add items to cart
3. Go to checkout
4. Sign in with Google (or email/password if created)

**Access:**
- Browse all restaurants: `/`
- View menu: `/r/{restaurant-slug}`
- Checkout: `/r/{restaurant-slug}/checkout`
- Order tracking: `/orders/{order-id}`
- Profile: `/profile`

---

## Role-Based Access Summary

| Feature | Customer | Restaurant | Admin |
|---------|----------|------------|-------|
| Browse Restaurants | ✅ | ✅ | ✅ |
| Place Orders | ✅ | ❌ | ❌ |
| Manage Menu | ❌ | ✅ | ✅ |
| View All Restaurants | ❌ | ❌ | ✅ |
| System Settings | ❌ | ❌ | ✅ |

---

## Common Login Issues

### Issue 1: "Invalid email or password"

**Solutions:**
1. Double-check email and password
2. Use forgot password feature
3. Make sure account exists in database

### Issue 2: Stuck at Login Page / Infinite Loop

**Solutions:**
1. Clear browser cache and cookies
2. Open in incognito/private window
3. Check browser console for errors (F12)
4. Make sure JavaScript is enabled

### Issue 3: Wrong Dashboard After Login

**Solutions:**
1. Check your role in database:
   ```sql
   SELECT u.email, p.role
   FROM auth.users u
   JOIN profiles p ON u.id = p.id
   WHERE u.email = 'your-email@example.com';
   ```
2. Update role if incorrect:
   ```sql
   UPDATE profiles
   SET role = 'SUPER_ADMIN' -- or 'RESTAURANT' or 'CUSTOMER'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```

---

## Next Steps

1. **Try logging in** with your existing admin account
2. **If password issue**, use "Forgot password?" feature
3. **Create test accounts** using the signup form
4. **Update roles** via SQL if needed
5. **Test each role** to explore features

---

## Need More Help?

Let me know if:
- You can't remember your password (use forgot password)
- You need help creating specific test accounts
- You're getting specific error messages
- You want me to create an automated test account creator page

---

## Quick Commands Reference

### Check Your Account:
```sql
SELECT u.email, p.role, p.full_name
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'psainath123@gmail.com';
```

### List All Users:
```sql
SELECT u.email, p.role, p.full_name, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

### Change User Role:
```sql
UPDATE profiles
SET role = 'RESTAURANT'
WHERE id = (SELECT id FROM auth.users WHERE email = 'email@example.com');
```

### Delete Test Account:
```sql
-- First delete from profiles
DELETE FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'test@example.com');

-- Then delete from auth.users (via Supabase Dashboard is easier)
```
