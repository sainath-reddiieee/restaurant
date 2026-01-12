// Updated: 2026-01-12 08:42 - Fixed UUID extraction logic
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  console.log('[Mock Callback V3] Starting callback processing...');
  try {
    console.log('[Mock Callback V3] Step 1: Parsing request body...');
    const body = await req.json();
    const { merchantTransactionId, status, amount } = body;

    console.log('[Mock Callback V3] Step 2: Request parsed successfully:', {
      merchantTransactionId,
      status,
      amount,
      timestamp: new Date().toISOString()
    });

    console.log('[Mock Callback V3] Step 3: Creating Supabase client...');
    console.log('[Mock Callback V3] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
    console.log('[Mock Callback V3] SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log('[Mock Callback V3] Step 4: Supabase client created successfully');

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
      console.log('[Mock Callback V3] Step 5: Processing wallet recharge...');

      // Extract transaction ID from RECHARGE-{uuid}-{timestamp}
      // Format: RECHARGE-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-timestamp
      // UUID has 5 parts, so we need parts[1] through parts[5]
      const parts = merchantTransactionId.split('-');
      const walletTxnId = parts.slice(1, 6).join('-'); // Reconstruct UUID from parts

      console.log('[Mock Callback V3] Full transaction ID:', merchantTransactionId);
      console.log('[Mock Callback V3] Parts after split:', parts);
      console.log('[Mock Callback V3] Extracted wallet transaction ID:', walletTxnId);

      console.log('[Mock Callback V3] Step 6: Querying wallet transaction from database...');
      // Look up the wallet transaction record
      const { data: walletTxn, error: walletTxnError } = await supabase
        .from('wallet_transactions')
        .select('restaurant_id, amount, id')
        .eq('id', walletTxnId)
        .maybeSingle();

      console.log('[Mock Callback V3] Step 7: Database query result:', {
        found: !!walletTxn,
        error: walletTxnError ? 'ERROR' : 'NO ERROR',
        walletTxnId
      });

      if (walletTxnError || !walletTxn) {
        console.error('[Mock Callback V3] ERROR: Wallet transaction not found or error occurred');
        console.error('[Mock Callback V3] Error details:', walletTxnError);
        throw walletTxnError || new Error('Wallet transaction not found');
      }

      console.log('[Mock Callback V3] Step 8: Transaction found, processing payment status:', status);

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
    console.error('[Mock Callback V3] ==================== CRITICAL ERROR ====================');
    console.error('[Mock Callback V3] Error type:', typeof error);
    console.error('[Mock Callback V3] Error:', error);

    if (error instanceof Error) {
      console.error('[Mock Callback V3] Error message:', error.message);
      console.error('[Mock Callback V3] Error stack:', error.stack);
    }

    // Try to extract more details if it's a Supabase error
    if (error && typeof error === 'object') {
      console.error('[Mock Callback V3] Error object keys:', Object.keys(error));
      console.error('[Mock Callback V3] Error details:', JSON.stringify(error, null, 2));
    }

    console.error('[Mock Callback V3] =========================================================');

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    }, { status: 500 });
  }
}
