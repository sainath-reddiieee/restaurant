import { NextRequest, NextResponse } from 'next/server';
import { checkPhonePePaymentStatus } from '@/lib/phonepe';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('PhonePe Callback received:', body);

    const { merchantTransactionId, transactionId, code } = body;

    if (!merchantTransactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing transaction ID' },
        { status: 400 }
      );
    }

    // Verify payment status with PhonePe
    const paymentStatus = await checkPhonePePaymentStatus(merchantTransactionId);

    if (!paymentStatus) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify payment status' },
        { status: 500 }
      );
    }

    console.log('Payment status:', paymentStatus);

    // Check if payment was successful
    if (paymentStatus.success && paymentStatus.code === 'PAYMENT_SUCCESS') {
      // Parse transaction ID to determine type
      // Format: ORDER-{orderId}-{timestamp} or RECHARGE-{restaurantId}-{timestamp}
      const [type, entityId] = merchantTransactionId.split('-');

      if (type === 'ORDER') {
        // Update order status
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            status: 'CONFIRMED',
            payment_verified: true,
            phonepe_transaction_id: paymentStatus.data?.transactionId || transactionId,
          })
          .eq('id', entityId);

        if (orderError) {
          console.error('Error updating order:', orderError);
          return NextResponse.json(
            { success: false, error: 'Failed to update order' },
            { status: 500 }
          );
        }

        console.log(`Order ${entityId} confirmed`);
      } else if (type === 'RECHARGE') {
        // Update wallet transaction and restaurant balance
        const { data: transaction, error: txnError } = await supabase
          .from('wallet_transactions')
          .select('amount, restaurant_id')
          .eq('id', entityId)
          .single();

        if (txnError || !transaction) {
          console.error('Error fetching transaction:', txnError);
          return NextResponse.json(
            { success: false, error: 'Transaction not found' },
            { status: 404 }
          );
        }

        // Update transaction status
        const { error: updateTxnError } = await supabase
          .from('wallet_transactions')
          .update({
            status: 'APPROVED',
            phonepe_transaction_id: paymentStatus.data?.transactionId || transactionId,
            approved_at: new Date().toISOString(),
          })
          .eq('id', entityId);

        if (updateTxnError) {
          console.error('Error updating transaction:', updateTxnError);
          return NextResponse.json(
            { success: false, error: 'Failed to update transaction' },
            { status: 500 }
          );
        }

        // Update restaurant balance using RPC function
        const { error: balanceError } = await supabase.rpc('increment_restaurant_balance', {
          restaurant_id: transaction.restaurant_id,
          amount: transaction.amount,
        });

        if (balanceError) {
          console.error('Error updating balance:', balanceError);
        }

        console.log(`Wallet recharged for restaurant ${transaction.restaurant_id}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
      });
    } else {
      console.log('Payment failed or pending:', paymentStatus);
      return NextResponse.json({
        success: false,
        message: paymentStatus.message || 'Payment verification failed',
      });
    }
  } catch (error) {
    console.error('PhonePe callback error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
