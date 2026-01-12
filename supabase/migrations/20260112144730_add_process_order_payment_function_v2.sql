/*
  # Add order payment processing function
  
  1. New Function
    - `process_order_payment` - Atomically processes order payment confirmation
      - Updates order status
      - Records payment transaction ID
      - Returns success/failure status
  
  2. Purpose
    - Handles payment callback processing in a single database transaction
    - Bypasses client-side networking issues in WebContainer environments
    - Ensures atomic updates with proper error handling
*/

CREATE OR REPLACE FUNCTION process_order_payment(
  order_id_param UUID,
  merchant_txn_id TEXT,
  payment_status TEXT
)
RETURNS JSON AS $$
DECLARE
  order_record RECORD;
  new_order_status order_status;
BEGIN
  -- Determine new order status based on payment status
  IF payment_status = 'success' THEN
    new_order_status := 'CONFIRMED'::order_status;
  ELSE
    new_order_status := 'PENDING'::order_status;
  END IF;

  -- Try to find and update the order
  UPDATE orders
  SET 
    status = new_order_status,
    payment_merchant_transaction_id = merchant_txn_id,
    updated_at = now()
  WHERE id = order_id_param OR payment_transaction_id = merchant_txn_id
  RETURNING * INTO order_record;

  -- Check if order was found and updated
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Order not found',
      'order_id', order_id_param
    );
  END IF;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Order payment processed successfully',
    'order_id', order_record.id,
    'new_status', order_record.status,
    'merchant_transaction_id', merchant_txn_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;