import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  console.log('[Mock Callback] Starting callback processing...');
  try {
    const body = await req.json();
    const { merchantTransactionId, status, amount } = body;

    console.log('[Mock PhonePe Callback] Received:', {
      merchantTransactionId,
      status,
      amount,
      timestamp: new Date().toISOString()
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Update order status based on payment result
    if (merchantTransactionId.startsWith('order_')) {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_transaction_id', merchantTransactionId)
        .maybeSingle();

      if (fetchError) {
        console.error('[Mock Callback] Error fetching order:', fetchError);
        throw fetchError;
      }

      if (!order) {
        console.error('[Mock Callback] Order not found:', merchantTransactionId);
        return NextResponse.json({
          success: false,
          message: 'Order not found'
        }, { status: 404 });
      }

      const newStatus = status === 'success' ? 'paid' : 'failed';
      const paymentStatus = status === 'success' ? 'completed' : 'failed';

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          payment_status: paymentStatus,
          payment_merchant_transaction_id: merchantTransactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('[Mock Callback] Error updating order:', updateError);
        throw updateError;
      }

      console.log('[Mock Callback] Order updated:', order.id, 'Status:', newStatus);
    }
    // Handle wallet recharge
    else if (merchantTransactionId.startsWith('RECHARGE-')) {
      // Extract transaction ID from RECHARGE-{txnId}-{timestamp}
      const parts = merchantTransactionId.split('-');
      const walletTxnId = parts[1];

      // Look up the wallet transaction record
      const { data: walletTxn, error: walletTxnError } = await supabase
        .from('wallet_transactions')
        .select('restaurant_id, amount, id')
        .eq('id', walletTxnId)
        .maybeSingle();

      if (walletTxnError || !walletTxn) {
        console.error('[Mock Callback] Error fetching wallet transaction:', walletTxnError);
        throw walletTxnError || new Error('Wallet transaction not found');
      }

      const restaurantId = walletTxn.restaurant_id;
      const rechargeAmount = walletTxn.amount;

      if (status === 'success') {
        const { data: restaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('credit_balance')
          .eq('id', restaurantId)
          .maybeSingle();

        if (restaurantError) {
          console.error('[Mock Callback] Error fetching restaurant:', restaurantError);
          throw restaurantError;
        }

        const currentBalance = restaurant?.credit_balance || 0;
        const newBalance = currentBalance + rechargeAmount;

        const { error: updateError } = await supabase
          .from('restaurants')
          .update({
            credit_balance: newBalance
          })
          .eq('id', restaurantId);

        if (updateError) {
          console.error('[Mock Callback] Error updating restaurant wallet:', updateError);
          throw updateError;
        }

        // Update wallet transaction status to APPROVED
        const { error: txUpdateError } = await supabase
          .from('wallet_transactions')
          .update({
            status: 'APPROVED',
            payment_transaction_id: merchantTransactionId
          })
          .eq('id', walletTxnId);

        if (txUpdateError) {
          console.error('[Mock Callback] Error updating wallet transaction:', txUpdateError);
        }

        console.log('[Mock Callback] Restaurant wallet credited:', restaurantId, 'Amount:', rechargeAmount);
      } else {
        // Mark transaction as rejected
        const { error: txUpdateError } = await supabase
          .from('wallet_transactions')
          .update({
            status: 'REJECTED',
            payment_transaction_id: merchantTransactionId
          })
          .eq('id', walletTxnId);

        if (txUpdateError) {
          console.error('[Mock Callback] Error updating wallet transaction:', txUpdateError);
        }
      }
    }

    console.log('[Mock Callback] Processing completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Mock PhonePe Callback] CRITICAL ERROR:', error);
    console.error('[Mock Callback] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.toString() : String(error)
    }, { status: 500 });
  }
}
