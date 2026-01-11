/*
  # Add Automatic Profile Creation Trigger

  ## Overview
  Creates a database trigger that automatically creates a profile record
  when a new user signs up through Supabase Auth.

  ## Changes
  1. Function: `handle_new_user()`
     - Automatically creates a profile for new auth.users
     - Extracts phone and full_name from user metadata
     - Sets default role as CUSTOMER
     - Uses user's email as fallback for phone

  2. Trigger: `on_auth_user_created`
     - Fires after INSERT on auth.users
     - Calls handle_new_user() function

  ## Security
  - Function runs with SECURITY DEFINER to bypass RLS
  - Only creates profiles for newly created users
  - No data loss risk as it only inserts new records
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'CUSTOMER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();