/*
  # Fix Loot Mode Stock Decrement Function

  ## Problem
  - The `decrement_stock` function was referencing non-existent column `daily_stock_remaining`
  - Actual column is `stock_remaining`
  - This caused loot items to always show as "grabbed by someone else"

  ## Solution
  - Replace function to use correct column `stock_remaining`
  - Use atomic UPDATE with WHERE clause to prevent race conditions
  - Only decrement if sufficient stock exists

  ## Changes
  - DROP and recreate `decrement_stock` function with correct column name
  - Add proper transaction safety for concurrent access
*/

-- Drop the existing incorrect function
DROP FUNCTION IF EXISTS decrement_stock(uuid, integer);

-- Create correct function that uses stock_remaining column
CREATE OR REPLACE FUNCTION decrement_stock(item_id uuid, quantity integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  rows_updated integer;
BEGIN
  -- Atomic update: only decrement if sufficient stock exists
  -- This prevents race conditions between checking stock and updating
  UPDATE menu_items
  SET stock_remaining = stock_remaining - quantity
  WHERE id = item_id 
    AND stock_remaining >= quantity
    AND is_clearance = true;
  
  -- Check if any row was updated
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Return true if stock was decremented, false if insufficient stock
  RETURN rows_updated > 0;
END;
$$;