/**
 * PhonePe Payment Gateway Utilities
 * Handles payment initiation, checksum generation, and verification
 */

import crypto from 'crypto';

export interface PhonePeConfig {
  merchantId: string;
  saltKey: string;
  saltIndex: string;
  hostUrl: string;
}

export interface PhonePePaymentRequest {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number; // in paise (₹1 = 100 paise)
  redirectUrl: string;
  redirectMode: 'POST' | 'REDIRECT';
  callbackUrl: string;
  mobileNumber?: string;
  paymentInstrument: {
    type: 'PAY_PAGE';
  };
}

export interface PhonePePaymentResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    merchantId: string;
    merchantTransactionId: string;
    instrumentResponse?: {
      type: string;
      redirectInfo?: {
        url: string;
        method: string;
      };
    };
  };
}

export interface PhonePeCallbackResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;
    amount: number;
    state: 'COMPLETED' | 'FAILED' | 'PENDING';
    responseCode: string;
    paymentInstrument?: {
      type: string;
      utr?: string;
    };
  };
}

/**
 * Get PhonePe configuration from environment variables
 */
export function getPhonePeConfig(): PhonePeConfig {
  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT',
    saltKey: process.env.PHONEPE_SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399',
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    hostUrl: process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  };
}

/**
 * Generate SHA256 checksum for PhonePe API
 */
export function generateChecksum(payload: string, saltKey: string, saltIndex: string): string {
  const string = payload + '/pg/v1/pay' + saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + saltIndex;
}

/**
 * Verify callback checksum
 */
export function verifyChecksum(
  xVerify: string,
  response: string,
  saltKey: string
): boolean {
  const [checksum, saltIndex] = xVerify.split('###');
  const string = response + saltKey;
  const calculatedChecksum = crypto.createHash('sha256').update(string).digest('hex');
  return checksum === calculatedChecksum;
}

/**
 * Initiate PhonePe payment
 */
export async function initiatePhonePePayment(
  transactionId: string,
  amount: number, // in rupees
  mobileNumber: string,
  userId: string,
  callbackUrl: string,
  redirectUrl: string
): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
  try {
    const config = getPhonePeConfig();

    // Convert amount to paise
    const amountInPaise = Math.round(amount * 100);

    const paymentRequest: PhonePePaymentRequest = {
      merchantId: config.merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: userId,
      amount: amountInPaise,
      redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl,
      mobileNumber,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    // Base64 encode the payment request
    const payload = Buffer.from(JSON.stringify(paymentRequest)).toString('base64');

    // Generate checksum
    const checksum = generateChecksum(payload, config.saltKey, config.saltIndex);

    // Make API call to PhonePe
    const response = await fetch(`${config.hostUrl}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({
        request: payload,
      }),
    });

    const result: PhonePePaymentResponse = await response.json();

    if (result.success && result.data?.instrumentResponse?.redirectInfo?.url) {
      return {
        success: true,
        redirectUrl: result.data.instrumentResponse.redirectInfo.url,
      };
    } else {
      return {
        success: false,
        error: result.message || 'Payment initiation failed',
      };
    }
  } catch (error) {
    console.error('PhonePe initiation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check payment status (for callback verification)
 */
export async function checkPhonePePaymentStatus(
  merchantTransactionId: string
): Promise<PhonePeCallbackResponse | null> {
  try {
    const config = getPhonePeConfig();

    const string = `/pg/v1/status/${config.merchantId}/${merchantTransactionId}` + config.saltKey;
    const checksum = crypto.createHash('sha256').update(string).digest('hex') + '###' + config.saltIndex;

    const response = await fetch(
      `${config.hostUrl}/pg/v1/status/${config.merchantId}/${merchantTransactionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': config.merchantId,
        },
      }
    );

    const result: PhonePeCallbackResponse = await response.json();
    return result;
  } catch (error) {
    console.error('PhonePe status check error:', error);
    return null;
  }
}
