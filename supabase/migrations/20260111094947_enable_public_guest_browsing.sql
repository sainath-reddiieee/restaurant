/*
  # Enable Public Guest Browsing

  ## Problem
  Current RLS policies require authentication to view restaurants and menu items.
  This creates a login wall preventing guest browsing.

  ## Solution
  Update RLS policies to allow anonymous (public) access to:
  - Active restaurants and their details
  - Available menu items
  - Active coupons

  ## Changes
  1. Drop existing restrictive policies for public data
  2. Create new policies allowing anon role access
  3. Maintain security for private operations (create, update, delete)

  ## Security Notes
  - Anonymous users can only SELECT (read) public data
  - Write operations still require authentication
  - Restaurant owners still control their own data
*/

-- Drop existing restrictive restaurant SELECT policies for authenticated users
DROP POLICY IF EXISTS "Public can view active restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can view own restaurant" ON restaurants;

-- Create new policy allowing ANYONE (including anon) to view active restaurants
CREATE POLICY "Anyone can view active restaurants"
  ON restaurants
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Restaurant owners can still view their own restaurant even if inactive
CREATE POLICY "Restaurant owners can view own restaurant"
  ON restaurants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND phone = restaurants.owner_phone
    )
  );

-- Drop existing restrictive menu items SELECT policy
DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;

-- Create new policy allowing ANYONE (including anon) to view available menu items
CREATE POLICY "Anyone can view available menu items"
  ON menu_items
  FOR SELECT
  TO anon, authenticated
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_items.restaurant_id
      AND restaurants.is_active = true
    )
  );

-- Drop existing coupons SELECT policy
DROP POLICY IF EXISTS "Customers can view active coupons" ON coupons;

-- Create new policy allowing ANYONE to view active coupons
CREATE POLICY "Anyone can view active coupons"
  ON coupons
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = coupons.restaurant_id
      AND restaurants.is_active = true
    )
  );
