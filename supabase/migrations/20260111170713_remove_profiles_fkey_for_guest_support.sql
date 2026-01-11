/*
  # Remove Foreign Key Constraint on Profiles for Guest Support

  ## Changes
  
  ### 1. Drop Foreign Key Constraint
  - Remove the FOREIGN KEY constraint on profiles.id → auth.users.id
  - This allows guest profiles to be created without auth.users entries
  - Authenticated users will still have matching IDs, but guests can have standalone profiles
  
  ## Rationale
  - Guest checkout requires creating profiles without authentication
  - The FK constraint was blocking guest profile creation
  - Guest profiles are identified by phone number instead of auth.users.id
  
  ## Security
  - RLS policies still protect profile access
  - Only CUSTOMER profiles can be created by anonymous users
  - Authenticated profiles remain tied to auth.users through application logic
*/

-- Drop the foreign key constraint that requires profiles.id to exist in auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;