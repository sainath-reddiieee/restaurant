import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, mobileNumber } = body;

    // Get environment variables
    const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT';
    const saltKey = process.env.PHONEPE_SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    const hostUrl = process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    // Create test transaction
    const transactionId = `DEBUG-${Date.now()}`;
    const userId = 'test-user-' + Date.now();
    const amountInPaise = Math.round(amount * 100);

    // Format mobile number
    let formattedMobile = mobileNumber.replace(/\D/g, '');
    if (formattedMobile.startsWith('91') && formattedMobile.length === 12) {
      formattedMobile = formattedMobile.substring(2);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/phonepe/callback`;
    const redirectUrl = `${baseUrl}/phonepe/payment-status?type=DEBUG&txnId=${transactionId}`;

    // Create payment request
    const paymentRequest = {
      merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: userId,
      amount: amountInPaise,
      redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl,
      mobileNumber: formattedMobile,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    // Base64 encode the payment request
    const payload = Buffer.from(JSON.stringify(paymentRequest)).toString('base64');

    // Generate checksum
    const checksumString = payload + '/pg/v1/pay' + saltKey;
    const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
    const checksum = sha256 + '###' + saltIndex;

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'accept': 'application/json',
    };

    // Prepare request body
    const requestBody = {
      request: payload,
    };

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        merchantId,
        saltKey: saltKey ? `${saltKey.substring(0, 8)}...${saltKey.substring(saltKey.length - 4)}` : 'NOT SET',
        saltIndex,
        hostUrl,
        baseUrl,
      },
      request: {
        transactionId,
        amount: amountInPaise,
        amountInRupees: amount,
        mobileNumber: formattedMobile,
        userId,
        callbackUrl,
        redirectUrl,
      },
      paymentRequest,
      payload: {
        original: JSON.stringify(paymentRequest),
        base64: payload,
        decoded: JSON.parse(Buffer.from(payload, 'base64').toString()),
      },
      checksum: {
        string: `${payload.substring(0, 20)}...${payload.substring(payload.length - 20)} + /pg/v1/pay + ${saltKey.substring(0, 8)}...`,
        sha256: sha256,
        final: checksum,
      },
      api: {
        url: `${hostUrl}/pg/v1/pay`,
        method: 'POST',
        headers,
        body: requestBody,
      },
    };

    // Make actual API call
    console.log('=== PHONEPE DEBUG REQUEST ===');
    console.log(JSON.stringify(debugInfo, null, 2));

    const response = await fetch(`${hostUrl}/pg/v1/pay`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    const apiResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: result,
    };

    console.log('=== PHONEPE DEBUG RESPONSE ===');
    console.log(JSON.stringify(apiResponse, null, 2));

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      response: apiResponse,
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
