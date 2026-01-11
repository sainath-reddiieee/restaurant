/*
  # Add Temporary Debug Policy for Profiles

  ## Purpose
  Add a temporary policy to help diagnose the RLS issue
  
  ## Changes
  - Add a SELECT policy that shows what auth.uid() returns
  - This will help us understand if the session is being passed correctly
  
  ## Security Note
  This is a DEBUG policy and should be removed after testing
*/

-- Create a function to log auth debugging info
CREATE OR REPLACE FUNCTION get_auth_debug_info()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'role', current_setting('request.jwt.claims', true)::jsonb->>'role',
    'has_session', CASE WHEN auth.uid() IS NOT NULL THEN true ELSE false END
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_auth_debug_info() TO authenticated, anon;
