import { NextRequest, NextResponse } from 'next/server';
import { checkPhonePePaymentStatus } from '@/lib/phonepe';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const txnId = searchParams.get('txnId');

    if (!txnId) {
      return NextResponse.json(
        { success: false, error: 'Missing transaction ID' },
        { status: 400 }
      );
    }

    // Check payment status with PhonePe
    const paymentStatus = await checkPhonePePaymentStatus(txnId);

    if (!paymentStatus) {
      return NextResponse.json(
        { success: false, error: 'Failed to check payment status' },
        { status: 500 }
      );
    }

    if (paymentStatus.success && paymentStatus.code === 'PAYMENT_SUCCESS') {
      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        transactionId: paymentStatus.data?.transactionId,
        amount: paymentStatus.data?.amount,
      });
    } else if (paymentStatus.code === 'PAYMENT_PENDING') {
      return NextResponse.json({
        success: false,
        pending: true,
        message: 'Payment is being processed',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: paymentStatus.message || 'Payment failed',
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
