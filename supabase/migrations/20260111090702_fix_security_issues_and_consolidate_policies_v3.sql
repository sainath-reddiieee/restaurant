/*
  # Fix Security Issues and Consolidate RLS Policies

  ## Security Improvements

  1. **Remove Unused Indexes**
     - Drop `idx_menu_items_clearance` - unused index
     - Drop `idx_orders_customer` - unused index
     - Drop `idx_orders_status` - unused index

  2. **Consolidate Multiple Permissive Policies**
     - Replace multiple permissive policies with single comprehensive policies per action
     - This prevents unintended access grants and improves security clarity
     - Each table will have one policy per action that handles all role-based access

  ## Important Notes

  ### Manual Configuration Required:
  
  **Auth DB Connection Strategy**: 
  - Go to Supabase Dashboard > Database Settings
  - Change connection pooling from fixed number to percentage-based allocation
  - This allows better scaling with instance size changes
  
  **Leaked Password Protection**:
  - Go to Supabase Dashboard > Authentication > Policies
  - Enable "Leaked Password Protection" to check passwords against HaveIBeenPwned.org
  - This prevents users from using compromised passwords

  ## Changes Made

  ### Indexes Removed:
  - idx_menu_items_clearance
  - idx_orders_customer  
  - idx_orders_status
  
  ### Policies Consolidated:
  All tables now have single comprehensive policies per action instead of multiple permissive policies.
*/

-- ============================================================================
-- STEP 1: Remove Unused Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_menu_items_clearance;
DROP INDEX IF EXISTS idx_orders_customer;
DROP INDEX IF EXISTS idx_orders_status;

-- ============================================================================
-- STEP 2: Consolidate RLS Policies - PROFILES Table
-- ============================================================================

-- Drop existing multiple policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;

-- Create single comprehensive SELECT policy
CREATE POLICY "Authenticated users can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = (select auth.uid())
      AND p.role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- STEP 3: Consolidate RLS Policies - RESTAURANTS Table
-- ============================================================================

-- Drop existing multiple policies
DROP POLICY IF EXISTS "Public can view active restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can view own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Super admins can manage all restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Super admins can delete restaurants" ON restaurants;

-- Create consolidated SELECT policy
CREATE POLICY "View restaurants policy"
  ON restaurants
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR
    owner_phone IN (
      SELECT phone FROM profiles WHERE id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Create consolidated UPDATE policy
CREATE POLICY "Update restaurants policy"
  ON restaurants
  FOR UPDATE
  TO authenticated
  USING (
    owner_phone IN (
      SELECT phone FROM profiles WHERE id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    owner_phone IN (
      SELECT phone FROM profiles WHERE id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Create consolidated DELETE policy (super admins only)
CREATE POLICY "Delete restaurants policy"
  ON restaurants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- STEP 4: Consolidate RLS Policies - MENU_ITEMS Table
-- ============================================================================

-- Drop existing multiple policies
DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
DROP POLICY IF EXISTS "Restaurant owners can manage own menu" ON menu_items;
DROP POLICY IF EXISTS "Super admins can manage all menu items" ON menu_items;

-- Create consolidated SELECT policy
CREATE POLICY "View menu items policy"
  ON menu_items
  FOR SELECT
  TO authenticated
  USING (
    is_available = true
    OR
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Create consolidated INSERT policy
CREATE POLICY "Insert menu items policy"
  ON menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Create consolidated UPDATE policy
CREATE POLICY "Update menu items policy"
  ON menu_items
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Create consolidated DELETE policy
CREATE POLICY "Delete menu items policy"
  ON menu_items
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- STEP 5: Consolidate RLS Policies - COUPONS Table
-- ============================================================================

-- Drop existing multiple policies
DROP POLICY IF EXISTS "Customers can view active coupons" ON coupons;
DROP POLICY IF EXISTS "Restaurant owners can manage own coupons" ON coupons;

-- Create consolidated SELECT policy
CREATE POLICY "View coupons policy"
  ON coupons
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Keep existing INSERT, UPDATE, DELETE policies as they're already single policies

-- ============================================================================
-- STEP 6: Consolidate RLS Policies - ORDERS Table
-- ============================================================================

-- Drop existing multiple policies
DROP POLICY IF EXISTS "Customers can create orders" ON orders;
DROP POLICY IF EXISTS "Super admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Restaurant owners can view own restaurant orders" ON orders;
DROP POLICY IF EXISTS "Restaurant owners can update own restaurant orders" ON orders;

-- Create consolidated SELECT policy
CREATE POLICY "View orders policy"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id = (select auth.uid())
    OR
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Create consolidated INSERT policy
CREATE POLICY "Insert orders policy"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Create consolidated UPDATE policy
CREATE POLICY "Update orders policy"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants
      WHERE owner_phone IN (
        SELECT phone FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );
