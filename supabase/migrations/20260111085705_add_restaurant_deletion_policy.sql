/*
  # Add Restaurant Deletion Capability

  1. Security
    - Add DELETE policy for super admins to delete restaurants
    - Ensure only SUPER_ADMIN role can delete restaurants
    
  2. Changes
    - New RLS policy: "Super admins can delete restaurants"
*/

-- Allow super admins to delete restaurants
CREATE POLICY "Super admins can delete restaurants"
  ON restaurants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );
