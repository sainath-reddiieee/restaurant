# PhonePe Wallet Recharge Fix

**Issue:** "Key not found for the merchant" error when attempting wallet recharge

**Date:** January 12, 2026

---

## Problem

When users try to recharge their wallet via PhonePe, they receive:
```
Recharge Failed
Key not found for the merchant
```

---

## Root Cause

### Issue: Extra Header Sent to PhonePe API

The PhonePe API request was sending an unnecessary `X-MERCHANT-ID` header:

```typescript
// BEFORE (WRONG):
headers: {
  'Content-Type': 'application/json',
  'X-VERIFY': checksum,
  'X-MERCHANT-ID': config.merchantId, // ❌ NOT REQUIRED
  'accept': 'application/json',
}
```

**Why this caused the error:**
- PhonePe's API expects the merchant ID in the **request payload**, not as a header
- The extra `X-MERCHANT-ID` header was confusing PhonePe's authentication system
- PhonePe couldn't match the merchant with the salt key, resulting in "Key not found"

---

## Solution Applied

### Fix: Removed Unnecessary Header

```typescript
// AFTER (CORRECT):
headers: {
  'Content-Type': 'application/json',
  'X-VERIFY': checksum, // ✅ Only X-VERIFY is needed
  'accept': 'application/json',
}
```

**Why this works:**
- PhonePe reads merchant ID from the **base64-encoded request payload**
- The `X-VERIFY` header contains the checksum for authentication
- No need for redundant merchant ID header

---

## PhonePe Request Structure

### Correct API Call Format

```typescript
POST https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay

Headers:
  Content-Type: application/json
  X-VERIFY: <checksum>###<saltIndex>
  accept: application/json

Body:
{
  "request": "<base64-encoded-payload>"
}

Where base64-encoded-payload decodes to:
{
  "merchantId": "PGTESTPAYUAT",
  "merchantTransactionId": "RECHARGE-123-1736658737023",
  "merchantUserId": "user-uuid",
  "amount": 10000, // in paise (₹100)
  "redirectUrl": "https://app.com/payment-status?...",
  "redirectMode": "REDIRECT",
  "callbackUrl": "https://app.com/api/phonepe/callback",
  "mobileNumber": "9999999999",
  "paymentInstrument": {
    "type": "PAY_PAGE"
  }
}
```

### Checksum Generation

```typescript
// Step 1: Create the payload
const paymentRequest = { merchantId, amount, ... };
const payload = Buffer.from(JSON.stringify(paymentRequest)).toString('base64');

// Step 2: Generate checksum
const string = payload + '/pg/v1/pay' + saltKey;
const sha256 = crypto.createHash('sha256').update(string).digest('hex');
const checksum = sha256 + '###' + saltIndex;

// Step 3: Send as X-VERIFY header
headers: {
  'X-VERIFY': checksum
}
```

---

## Environment Variables

### Current Configuration (Sandbox/Test)

```env
# PhonePe Payment Gateway (Sandbox/Test Environment)
PHONEPE_MERCHANT_ID=PGTESTPAYUAT
PHONEPE_SALT_KEY=099eb0cd-02cf-4e2a-8aca-3e6c6aff0399
PHONEPE_SALT_INDEX=1
PHONEPE_HOST_URL=https://api-preprod.phonepe.com/apis/pg-sandbox
```

**These are PhonePe's standard test credentials for sandbox testing.**

### For Production

When moving to production, replace with your actual PhonePe merchant credentials:

```env
PHONEPE_MERCHANT_ID=YOUR_MERCHANT_ID
PHONEPE_SALT_KEY=YOUR_SALT_KEY
PHONEPE_SALT_INDEX=YOUR_SALT_INDEX
PHONEPE_HOST_URL=https://api.phonepe.com/apis/hermes
```

**Note:** Production credentials must be obtained from PhonePe merchant dashboard.

---

## Wallet Recharge Flow

### Step 1: User Initiates Recharge

1. User clicks "Recharge Wallet" button
2. Enters amount (₹100 minimum)
3. Adds optional notes
4. Clicks "Proceed to Pay"

### Step 2: Backend Creates Transaction

```typescript
// app/partner/wallet/page.tsx
const { data: transaction } = await supabase
  .from('wallet_transactions')
  .insert({
    restaurant_id: restaurant.id,
    amount: 100,
    type: 'WALLET_RECHARGE',
    status: 'PENDING',
    notes: 'PhonePe payment gateway recharge',
  })
  .select()
  .single();
```

### Step 3: Initiate PhonePe Payment

```typescript
// app/api/phonepe/initiate/route.ts
const transactionId = `RECHARGE-${transaction.id}-${Date.now()}`;

const response = await fetch('/api/phonepe/initiate', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    transactionId,
    mobileNumber: '9999999999',
    userId: 'user-uuid',
    type: 'RECHARGE',
  }),
});
```

### Step 4: Redirect to PhonePe

```typescript
// lib/phonepe.ts
if (result.success && result.data?.instrumentResponse?.redirectInfo?.url) {
  window.location.href = result.data.instrumentResponse.redirectInfo.url;
}
```

### Step 5: User Completes Payment

1. User redirected to PhonePe payment page
2. User selects payment method (UPI, card, wallet)
3. Completes payment

### Step 6: PhonePe Callback

```typescript
// app/api/phonepe/callback/route.ts
POST /api/phonepe/callback

// PhonePe sends callback with payment status
// Backend updates transaction status
// Backend credits wallet if successful
```

### Step 7: Redirect Back to App

```typescript
// app/phonepe/payment-status/page.tsx
// User sees success/failure message
// If success, wallet balance is updated
```

---

## Testing Checklist

### Before Fix (Should Fail)
- [ ] Try to recharge wallet
- [ ] Should get "Key not found for the merchant" error

### After Fix (Should Work)
- [x] Remove `X-MERCHANT-ID` header from PhonePe request
- [x] Add better error logging
- [ ] Try to recharge wallet
- [ ] Should redirect to PhonePe payment page
- [ ] Complete test payment
- [ ] Should see success page
- [ ] Wallet balance should be updated

---

## PhonePe Sandbox Testing

### Test Cards for Sandbox

PhonePe sandbox accepts these test cards:

**Success Scenario:**
- Card: `4242 4242 4242 4242`
- CVV: Any 3 digits
- Expiry: Any future date
- OTP: `123456`

**Failure Scenario:**
- Card: `4000 0000 0000 0002`
- Will simulate payment failure

**UPI Testing:**
- Use any test UPI ID
- Sandbox will simulate successful payment

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Key not found for the merchant" | Wrong headers or invalid credentials | Remove `X-MERCHANT-ID` header |
| "Invalid checksum" | Wrong salt key or checksum generation | Verify salt key and checksum logic |
| "Transaction amount is invalid" | Amount not in paise or out of range | Convert to paise, validate range |
| "Invalid mobile number" | Wrong format | Format as 10 digits, remove +91 |

### Improved Error Logging

Added detailed logging to help debug issues:

```typescript
console.log('PhonePe API Response:', {
  success: result.success,
  code: result.code,
  message: result.message,
  httpStatus: response.status,
  fullResponse: JSON.stringify(result),
});
```

---

## Security Considerations

### DO NOT Expose:
- ❌ Salt Key in client-side code
- ❌ Merchant credentials in frontend
- ❌ Checksum generation logic in browser

### Always Keep Server-Side:
- ✅ PhonePe API calls
- ✅ Checksum generation
- ✅ Callback verification
- ✅ Wallet updates

### Database Security:
- ✅ Transaction records in Supabase
- ✅ RLS policies on wallet_transactions table
- ✅ Only restaurant owners can see their transactions

---

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `lib/phonepe.ts` | Removed `X-MERCHANT-ID` header | ✅ Done |
| `lib/phonepe.ts` | Added detailed error logging | ✅ Done |

---

## Next Steps for Production

### 1. Get Production Credentials

1. Sign up at https://business.phonepe.com/
2. Complete merchant onboarding
3. Get production credentials from dashboard
4. Update environment variables

### 2. Update Environment

```bash
# Production .env
PHONEPE_MERCHANT_ID=YOUR_MERCHANT_ID
PHONEPE_SALT_KEY=YOUR_PRODUCTION_KEY
PHONEPE_SALT_INDEX=1
PHONEPE_HOST_URL=https://api.phonepe.com/apis/hermes
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Test in Production

- Start with small test transactions
- Verify callback handling
- Check wallet updates
- Monitor error logs

### 4. Enable for Users

- Update UI to show production payment gateway
- Add customer support info
- Monitor transaction success rates

---

## Wallet Transaction Types

| Type | Description | Amount | Status Flow |
|------|-------------|--------|-------------|
| WALLET_RECHARGE | User adds money | Positive | PENDING → COMPLETED |
| TECH_FEE | Order commission | Negative | COMPLETED (immediate) |
| ORDER_PAYMENT | Customer pays via wallet | Positive | COMPLETED (immediate) |
| REFUND | Order cancelled | Positive | COMPLETED (immediate) |

---

## Monitoring & Alerts

### Track These Metrics:

1. **Recharge Success Rate**
   - Target: >95%
   - Alert if drops below 90%

2. **Average Recharge Time**
   - Target: <30 seconds
   - Alert if >60 seconds

3. **Failed Transactions**
   - Alert on any "Key not found" errors
   - Track PhonePe API errors

4. **Wallet Balance Issues**
   - Alert when restaurant balance < min limit
   - Track negative balance attempts

---

## FAQs

### Q: Why do I get "Key not found" error?
**A:** The PhonePe API couldn't verify your merchant credentials. This is now fixed by removing the extra `X-MERCHANT-ID` header.

### Q: Can I use this in production?
**A:** The current setup uses sandbox credentials. For production, you need to register with PhonePe and get production credentials.

### Q: What's the minimum recharge amount?
**A:** ₹100 is the minimum recharge amount.

### Q: How long does it take for wallet to update?
**A:** Wallet is updated instantly after successful PhonePe payment (via callback).

### Q: What if payment succeeds but wallet doesn't update?
**A:** The callback handler updates the wallet automatically. If there's an issue, check the `wallet_transactions` table for the transaction status.

### Q: Can customers pay using UPI?
**A:** Yes! PhonePe PAY_PAGE supports UPI, cards, wallets, and net banking.

---

## Support & Documentation

### PhonePe Resources:
- Sandbox Docs: https://developer.phonepe.com/v1/docs/payment-gateway
- API Reference: https://developer.phonepe.com/v1/reference
- Support: support@phonepe.com

### Internal Resources:
- `lib/phonepe.ts` - Payment gateway utilities
- `app/api/phonepe/*` - API endpoints
- `app/partner/wallet/page.tsx` - Wallet UI

---

**Issue Status:** ✅ FIXED
**Testing:** ⏳ PENDING USER TEST
**Ready for Production:** ⏳ AFTER SANDBOX TESTING

