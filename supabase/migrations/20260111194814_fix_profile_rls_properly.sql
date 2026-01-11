/*
  # Fix Profile RLS Policies Properly
  
  ## Problem
  Previous migrations removed the super admin policy to fix recursion,
  but this broke profile access. Users get "profile not found" even after
  successful login because the SELECT policy is too restrictive.
  
  ## Root Cause
  The policies have conflicting requirements:
  1. Users need to read their OWN profile (for auth checks)
  2. Super admins need to read ALL profiles (for admin dashboard)
  3. But checking if someone is a super admin requires reading profiles → recursion!
  
  ## Solution
  Use a SECURITY DEFINER function that bypasses RLS to check super admin status.
  This breaks the recursion loop while maintaining functionality.
  
  ## Changes
  1. Drop all existing SELECT policies on profiles
  2. Recreate the is_super_admin() function with proper SECURITY DEFINER
  3. Create a single SELECT policy that allows:
     - Users to view their own profile (no recursion)
     - Super admins to view all profiles (via SECURITY DEFINER function)
*/

-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile or super admin can view all" ON profiles;

-- Drop and recreate the is_super_admin function with proper settings
DROP FUNCTION IF EXISTS public.is_super_admin();

-- Create SECURITY DEFINER function that bypasses RLS
-- This is safe because it only checks the current user's role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER means this function runs with the privileges of the function owner
  -- This bypasses RLS and prevents infinite recursion
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Create a single comprehensive SELECT policy
CREATE POLICY "Users can view own profile and super admins can view all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always view their own profile (no function call, no recursion)
    auth.uid() = id 
    OR 
    -- Super admins can view all profiles (via SECURITY DEFINER function)
    public.is_super_admin()
  );

-- Ensure INSERT policy exists for profile creation
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure UPDATE policy exists
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fix DELETE policy to use direct role check instead of function
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
CREATE POLICY "Super admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Use the SECURITY DEFINER function here too
    public.is_super_admin()
  );
