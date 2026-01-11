/*
  # Fix RLS Infinite Recursion in Profiles Table

  ## Problem
  The `is_super_admin()` function creates infinite recursion:
  - SELECT policy checks `is_super_admin()`
  - `is_super_admin()` tries to SELECT from profiles
  - That SELECT checks `is_super_admin()` again → infinite loop
  
  ## Solution
  Simplify RLS policies to avoid recursive checks:
  1. Users can ALWAYS read their own profile (no function calls)
  2. Remove `is_super_admin()` from SELECT policy
  3. Keep other policies simple and non-recursive
  
  ## Changes
  - Drop existing SELECT policy with recursive check
  - Create new simple SELECT policy: users can only read their own profile
  - This breaks the recursion and allows profiles to load
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view own profile or super admin can view all" ON profiles;

-- Create simple non-recursive policy: users can ONLY read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Optional: If we need super admins to view all profiles, do it without recursion
-- We'll add this later with a different approach that doesn't cause recursion
