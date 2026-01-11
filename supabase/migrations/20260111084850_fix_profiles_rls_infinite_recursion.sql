/*
  # Fix Infinite Recursion in Profiles RLS Policies

  1. Problem
    - The "Super admins can view all profiles" policy causes infinite recursion
    - It tries to check profiles table while accessing profiles table
    
  2. Solution
    - Create a security definer function that bypasses RLS to check user role
    - Update the super admin policy to use this function
    - This breaks the infinite recursion cycle
    
  3. Security
    - Function is marked as SECURITY DEFINER to bypass RLS
    - Function is STABLE and only reads data, never modifies
    - Only checks the role of the current authenticated user
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;

-- Create a security definer function to check if current user is super admin
-- This function bypasses RLS and breaks the infinite recursion
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate the policy using the security definer function
CREATE POLICY "Super admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_super_admin());
