/*
  # Add PhonePe Transaction Tracking Fields

  1. Changes to `orders` table
    - Add `payment_verified` (boolean, default false)
    - Add `phonepe_transaction_id` (text, nullable)

  2. Changes to `wallet_transactions` table
    - Add `phonepe_transaction_id` (text, nullable)

  3. New Database Function
    - `increment_restaurant_balance` - Safely increments restaurant balance

  4. Security
    - All fields accessible with existing RLS policies
*/

-- Add PhonePe tracking fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phonepe_transaction_id TEXT;

-- Add PhonePe tracking field to wallet_transactions table
ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS phonepe_transaction_id TEXT;

-- Create function to safely increment restaurant balance
CREATE OR REPLACE FUNCTION increment_restaurant_balance(
  restaurant_id UUID,
  amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE restaurants
  SET credit_balance = credit_balance + amount
  WHERE id = restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON COLUMN orders.payment_verified IS 'Whether payment has been verified via PhonePe callback';
COMMENT ON COLUMN orders.phonepe_transaction_id IS 'PhonePe transaction ID for payment tracking';
COMMENT ON COLUMN wallet_transactions.phonepe_transaction_id IS 'PhonePe transaction ID for wallet recharge tracking';
COMMENT ON FUNCTION increment_restaurant_balance IS 'Safely increments restaurant credit balance by given amount';