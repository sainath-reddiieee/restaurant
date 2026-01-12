/*
  # Add Process Wallet Recharge Function

  1. New Functions
    - `process_wallet_recharge` - Complete wallet recharge processing in one atomic operation
      - Takes wallet_txn_id (uuid), payment_txn_id (text), and payment_status (text) as parameters
      - Returns JSON with success status and message
      - Runs with SECURITY DEFINER to bypass RLS
      - Performs all operations atomically in a transaction
  
  2. Purpose
    - Handles complete wallet recharge flow in database
    - Updates restaurant balance
    - Updates transaction status
    - All in one atomic operation
  
  3. Security
    - Function runs with SECURITY DEFINER (elevated privileges)
    - Only accessible via service role key in backend
*/

-- Create function to process wallet recharge
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
  v_new_status text;
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

  -- Determine new status
  IF payment_status = 'success' THEN
    v_new_status := 'APPROVED';
    
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
    v_new_status := 'REJECTED';
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
    'new_status', v_new_status
  );
END;
$$;