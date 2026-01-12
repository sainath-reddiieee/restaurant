/*
  # Add Payment Transaction ID to Wallet Transactions

  1. Changes
    - Add `payment_transaction_id` column to `wallet_transactions` table
    - This stores the PhonePe/payment gateway transaction ID for tracking
    - Allows linking wallet transactions to external payment systems

  2. Notes
    - Column is nullable as some transactions (like fee deductions) won't have payment IDs
    - Used by payment verification and callback endpoints
*/

-- Add payment_transaction_id column to wallet_transactions
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT;

-- Create index for faster lookup by payment transaction ID
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_txn 
ON wallet_transactions(payment_transaction_id) 
WHERE payment_transaction_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN wallet_transactions.payment_transaction_id IS 'External payment gateway transaction ID (PhonePe/Razorpay etc)';
