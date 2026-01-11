/*
  # Remove ALL Recursive RLS Policies - Final Fix

  ## Problem
  The SELECT and DELETE policies still call `is_super_admin()` which creates infinite recursion:
  - Policy calls is_super_admin()
  - Function tries to read profiles table
  - Reading profiles triggers the same policy again
  - Infinite loop!

  ## Solution
  Replace ALL policies with simple, non-recursive checks using only auth.uid()

  ## Changes
  1. Drop all existing policies on profiles
  2. Create simple, non-recursive policies
  3. Super admin checks will be done at application level, not RLS level
*/

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile and super admins can view all" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create simple SELECT policy - NO recursion
CREATE POLICY "authenticated_users_select_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create simple INSERT policy
CREATE POLICY "authenticated_users_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create simple UPDATE policy
CREATE POLICY "authenticated_users_update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simple DELETE policy - users can delete their own profile
-- Super admin deletion will be handled at application level
CREATE POLICY "authenticated_users_delete_own_profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
