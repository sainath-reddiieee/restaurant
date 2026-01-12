import { NextRequest, NextResponse } from 'next/server';
import { checkPhonePePaymentStatus } from '@/lib/phonepe';
import { createClient } from '@supabase/supabase-js';

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

    const isMockMode = process.env.PHONEPE_MOCK_MODE === 'true';

    if (isMockMode) {
      console.log('[PhonePe Verify] Using MOCK mode verification');

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      if (txnId.startsWith('order_')) {
        const { data: order, error } = await supabase
          .from('orders')
          .select('status, payment_status, payment_transaction_id, total_amount')
          .eq('payment_transaction_id', txnId)
          .maybeSingle();

        if (error) {
          console.error('[Mock Verify] Database error:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to verify payment' },
            { status: 500 }
          );
        }

        if (!order) {
          return NextResponse.json(
            { success: false, error: 'Transaction not found' },
            { status: 404 }
          );
        }

        if (order.payment_status === 'completed' || order.status === 'paid') {
          return NextResponse.json({
            success: true,
            message: 'Payment verified successfully',
            transactionId: txnId,
            amount: order.total_amount,
          });
        } else if (order.payment_status === 'pending') {
          return NextResponse.json({
            success: false,
            pending: true,
            message: 'Payment is being processed',
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Payment failed',
          });
        }
      } else if (txnId.startsWith('RECHARGE-')) {
        // Extract transaction ID from RECHARGE-{uuid}-{timestamp}
        // Format: RECHARGE-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-timestamp
        // UUID has 5 parts, so we need parts[1] through parts[5]
        const parts = txnId.split('-');
        const walletTxnId = parts.slice(1, 6).join('-'); // Reconstruct UUID from parts

        console.log('[Mock Verify] Extracted wallet transaction ID:', walletTxnId);

        const { data: transaction, error } = await supabase
          .from('wallet_transactions')
          .select('status, amount, payment_transaction_id, id')
          .eq('id', walletTxnId)
          .maybeSingle();

        if (error) {
          console.error('[Mock Verify] Database error:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to verify payment' },
            { status: 500 }
          );
        }

        if (!transaction) {
          return NextResponse.json(
            { success: false, error: 'Transaction not found' },
            { status: 404 }
          );
        }

        if (transaction.status === 'APPROVED') {
          return NextResponse.json({
            success: true,
            message: 'Payment verified successfully',
            transactionId: txnId,
            amount: transaction.amount,
          });
        } else if (transaction.status === 'PENDING') {
          return NextResponse.json({
            success: false,
            pending: true,
            message: 'Payment is being processed',
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Payment failed or rejected',
          });
        }
      }

      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID format' },
        { status: 400 }
      );
    }

    console.log('[PhonePe Verify] Using REAL PhonePe API verification');

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
