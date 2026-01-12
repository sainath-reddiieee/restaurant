# Wallet Recharge Fix - Complete Guide

## Issues Fixed

### 1. Missing Database Column
**Problem**: `wallet_transactions` table was missing `payment_transaction_id` column
**Solution**: Created migration to add the column
- File: `supabase/migrations/add_payment_transaction_id_to_wallet.sql`
- Added index for performance
- Column stores PhonePe/payment gateway transaction IDs

### 2. Service Role Key Missing
**Problem**: Payment callbacks require service role key to bypass RLS
**Solution**:
- Added placeholder in `.env` file
- Added fallback to anon key in all API routes
- Added clear instructions for obtaining the key

### 3. Payment Status Verification Mismatch
**Problem**: Verify endpoint checked for `COMPLETED` but callback set `APPROVED`
**Solution**: Updated verify endpoint to check for `APPROVED` status

### 4. Wallet Balance Display Sync
**Problem**: All users showed `profiles.wallet_balance`
**Solution**:
- Restaurant users now show `restaurants.credit_balance`
- Profile page fetches restaurant data for RESTAURANT role
- Correct balance displayed per user type

## Required: Get Service Role Key

The wallet recharge system requires the Supabase service role key to function properly. This key allows the payment callback to bypass Row Level Security (RLS) and update restaurant balances.

### Steps to Get Service Role Key:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `hoyixqooigrcwgmnpela`
3. Navigate to: **Project Settings** → **API**
4. Find the **service_role** key (NOT the anon key)
5. Copy the entire key

### Add to .env File:

Replace `your_service_role_key_here` in `.env` with your actual service role key:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Security Warning:
- **NEVER** commit this key to git
- **NEVER** expose it to the client-side
- This key bypasses all RLS policies
- Only use in server-side API routes

## Testing Wallet Recharge

### 1. Login as Restaurant Owner
- Use phone: `9876543210` (or your test restaurant account)
- Navigate to Partner Portal → Wallet

### 2. Initiate Recharge
- Click "Recharge Wallet" button
- Enter amount (minimum ₹100)
- Submit the form

### 3. Mock Payment Flow
- You'll be redirected to mock payment page
- Choose "Success" to simulate successful payment
- System will:
  1. Call callback endpoint
  2. Update `restaurants.credit_balance`
  3. Mark transaction as `APPROVED`
  4. Redirect to wallet page

### 4. Verify Results
- Check wallet balance updated on dashboard
- View transaction in wallet history
- Transaction should show status: `APPROVED`

## Debug Tools

### 1. Debug Wallet Endpoint
Check wallet state for any user:

```bash
GET /api/phonepe/debug-wallet?phone=9876543210
```

**Returns**:
- Profile details
- Restaurant data (if applicable)
- Recent 10 transactions
- Current balance from correct source

### 2. Console Logs
Enhanced logging in mock callback:
- Request received timestamp
- Processing steps
- Error details with stack traces
- Success confirmation

### 3. Check Transaction in Database
Query directly in Supabase SQL Editor:

```sql
SELECT
  wt.id,
  wt.amount,
  wt.type,
  wt.status,
  wt.payment_transaction_id,
  wt.created_at,
  r.name as restaurant_name,
  r.credit_balance
FROM wallet_transactions wt
JOIN restaurants r ON r.id = wt.restaurant_id
WHERE wt.type = 'WALLET_RECHARGE'
ORDER BY wt.created_at DESC
LIMIT 10;
```

## System Architecture

### Wallet Balance Sources:
- **Customers**: `profiles.wallet_balance`
- **Restaurants**: `restaurants.credit_balance`
- **Super Admins**: `profiles.wallet_balance`

### Transaction Statuses:
- `PENDING`: Initial state when created
- `APPROVED`: Payment successful, balance credited
- `REJECTED`: Payment failed or rejected

### Payment Flow:

```
1. User initiates recharge
   ↓
2. Create PENDING transaction in database
   ↓
3. Redirect to payment gateway (or mock)
   ↓
4. User completes payment
   ↓
5. Payment gateway calls callback endpoint
   ↓
6. Callback updates:
   - Restaurant credit_balance (adds amount)
   - Transaction status (PENDING → APPROVED)
   ↓
7. User redirected to verification page
   ↓
8. Verify endpoint checks transaction status
   ↓
9. If APPROVED: Show success, redirect to wallet
   If PENDING: Keep polling
   If REJECTED: Show error
```

## Common Issues & Solutions

### Issue: "Failed to verify payment"
**Cause**: Transaction status still PENDING
**Solution**: Check if callback was executed successfully

### Issue: "supabaseKey is required"
**Cause**: Missing service role key
**Solution**: Add key to .env file as shown above

### Issue: Balance not updating
**Cause**: RLS blocking update or callback failed
**Solution**:
- Check service role key is present
- Check callback logs for errors
- Verify RLS policies allow updates

### Issue: "Transaction not found"
**Cause**: Transaction ID mismatch
**Solution**: Check that transaction was created before payment initiation

## Files Modified

1. **Database Migration**:
   - `supabase/migrations/add_payment_transaction_id_to_wallet.sql`

2. **API Routes**:
   - `app/api/phonepe/mock/callback/route.ts` - Fixed table/column names, added service key fallback
   - `app/api/phonepe/verify/route.ts` - Fixed status check (APPROVED vs COMPLETED)
   - `app/api/phonepe/debug-wallet/route.ts` - New debug endpoint

3. **UI Pages**:
   - `app/profile/page.tsx` - Fixed balance display for restaurant users
   - `app/partner/wallet/page.tsx` - (No changes needed)

4. **Configuration**:
   - `.env` - Added service role key placeholder with instructions

## Next Steps

1. **Add the service role key** to `.env` file
2. **Restart the development server** to load new environment variables
3. **Test the wallet recharge flow** as described above
4. **Monitor console logs** for any errors
5. **Use debug endpoint** to verify wallet state

## Support

If issues persist:
1. Check console logs for detailed error messages
2. Use debug endpoint to inspect wallet state
3. Verify service role key is correct
4. Check Supabase dashboard for any database errors
5. Ensure RLS policies are properly configured
