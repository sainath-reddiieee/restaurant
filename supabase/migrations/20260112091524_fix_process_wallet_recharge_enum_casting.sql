/*
  # Fix Process Wallet Recharge Function - Enum Casting

  1. Changes
    - Update `process_wallet_recharge` function to properly cast status to enum type
    - Use explicit type casting for wallet_transaction_status enum
  
  2. Purpose
    - Fix "column status is of type wallet_transaction_status but expression is of type text" error
*/

-- Drop and recreate function with proper enum casting
DROP FUNCTION IF EXISTS process_wallet_recharge(uuid, text, text);

CREATE OR REPLACE FUNCTION process_wallet_recharge(
  wallet_txn_id uuid,
  payment_txn_id text,
  payment_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id uuid;
  v_amount integer;
  v_new_status wallet_transaction_status;
BEGIN
  -- Get wallet transaction details
  SELECT restaurant_id, amount
  INTO v_restaurant_id, v_amount
  FROM wallet_transactions
  WHERE id = wallet_txn_id;

  -- Check if transaction exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Wallet transaction not found'
    );
  END IF;

  -- Determine new status and cast to enum type
  IF payment_status = 'success' THEN
    v_new_status := 'APPROVED'::wallet_transaction_status;
    
    -- Update restaurant balance
    UPDATE restaurants
    SET credit_balance = credit_balance + v_amount
    WHERE id = v_restaurant_id;

    -- Check if restaurant was updated
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Restaurant not found'
      );
    END IF;
  ELSE
    v_new_status := 'REJECTED'::wallet_transaction_status;
  END IF;

  -- Update wallet transaction status
  UPDATE wallet_transactions
  SET 
    status = v_new_status,
    payment_transaction_id = payment_txn_id
  WHERE id = wallet_txn_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Wallet recharge processed successfully',
    'restaurant_id', v_restaurant_id,
    'amount', v_amount,
    'new_status', v_new_status::text
  );
END;
$$;