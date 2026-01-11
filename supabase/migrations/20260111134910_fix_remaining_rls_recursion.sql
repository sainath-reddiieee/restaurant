/*
  # Fix Remaining RLS Recursion Issues

  ## Problem
  The DELETE policy on profiles still uses `is_super_admin()` which causes recursion
  
  ## Solution
  Replace `is_super_admin()` with direct role check in the DELETE policy
  - Check role directly without calling the function
  - Use a subquery that reads from profiles (which is now safe)
  
  ## Changes
  - Drop old DELETE policy with is_super_admin()
  - Create new DELETE policy with direct role check (no function)
*/

-- Drop the problematic DELETE policy
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;

-- Create new DELETE policy without recursive function call
-- Note: This will allow super admins to delete other profiles
-- The subquery should work because they're reading their own profile
CREATE POLICY "Super admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );
