// Updated: 2026-01-12 09:05 - Fixed Supabase client initialization
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client OUTSIDE handler for proper initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(req: NextRequest) {
  console.log('[Mock Callback V4] Starting callback processing...');
  try {
    console.log('[Mock Callback V4] Step 1: Parsing request body...');
    const body = await req.json();
    const { merchantTransactionId, status, amount } = body;

    console.log('[Mock Callback V4] Step 2: Request parsed successfully:', {
      merchantTransactionId,
      status,
      amount,
      timestamp: new Date().toISOString()
    });

    console.log('[Mock Callback V4] Step 3: Supabase client ready');

    // Update order status based on payment result
    if (merchantTransactionId.startsWith('order_') || merchantTransactionId.startsWith('ORDER-')) {
      console.log('[Mock Callback V4] Step 5: Processing order payment...');

      // For ORDER- format, extract the order ID
      // Format: ORDER-{uuid}-{timestamp}
      let orderId = null;
      if (merchantTransactionId.startsWith('ORDER-')) {
        const parts = merchantTransactionId.split('-');
        // Parts: ['ORDER', uuid part 1, uuid part 2, uuid part 3, uuid part 4, uuid part 5, timestamp]
        orderId = parts.slice(1, 6).join('-'); // Reconstruct UUID
        console.log('[Mock Callback V4] ORDER format - Extracted order ID:', orderId);
      }

      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .or(orderId ? `payment_transaction_id.eq.${merchantTransactionId},id.eq.${orderId}` : `payment_transaction_id.eq.${merchantTransactionId}`)
        .maybeSingle();

      if (fetchError) {
        console.error('[Mock Callback V4] Error fetching order:', fetchError);
        throw fetchError;
      }

      if (!order) {
        console.error('[Mock Callback V4] Order not found:', merchantTransactionId);
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
        console.error('[Mock Callback V4] Error updating order:', updateError);
        throw updateError;
      }

      console.log('[Mock Callback V4] Order updated:', order.id, 'Status:', newStatus);
    }
    // Handle wallet recharge
    else if (merchantTransactionId.startsWith('RECHARGE-')) {
      console.log('[Mock Callback V4] Step 5: Processing wallet recharge...');

      // Extract transaction ID from RECHARGE-{uuid}-{timestamp}
      // Format: RECHARGE-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-timestamp
      // UUID has 5 parts, so we need parts[1] through parts[5]
      const parts = merchantTransactionId.split('-');
      const walletTxnId = parts.slice(1, 6).join('-'); // Reconstruct UUID from parts

      console.log('[Mock Callback V4] Full transaction ID:', merchantTransactionId);
      console.log('[Mock Callback V4] Parts after split:', parts);
      console.log('[Mock Callback V4] Extracted wallet transaction ID:', walletTxnId);

      console.log('[Mock Callback V4] Step 6: Querying wallet transaction from database...');
      // Look up the wallet transaction record
      const { data: walletTxn, error: walletTxnError } = await supabase
        .from('wallet_transactions')
        .select('restaurant_id, amount, id')
        .eq('id', walletTxnId)
        .maybeSingle();

      console.log('[Mock Callback V4] Step 7: Database query result:', {
        found: !!walletTxn,
        error: walletTxnError ? 'ERROR' : 'NO ERROR',
        walletTxnId
      });

      if (walletTxnError || !walletTxn) {
        console.error('[Mock Callback V4] ERROR: Wallet transaction not found or error occurred');
        console.error('[Mock Callback V4] Error details:', walletTxnError);
        throw walletTxnError || new Error('Wallet transaction not found');
      }

      console.log('[Mock Callback V4] Step 7: Calling database function to process recharge...');
      console.log('[Mock Callback V4] Wallet Transaction ID:', walletTxnId);
      console.log('[Mock Callback V4] Payment Transaction ID:', merchantTransactionId);
      console.log('[Mock Callback V4] Payment Status:', status);

      // Use single database function to handle everything atomically
      const { data: result, error: processError } = await supabase.rpc('process_wallet_recharge', {
        wallet_txn_id: walletTxnId,
        payment_txn_id: merchantTransactionId,
        payment_status: status
      });

      console.log('[Mock Callback V4] Step 8: Database function result:', {
        success: result?.success,
        message: result?.message,
        error: processError ? 'ERROR' : 'NO ERROR'
      });

      if (processError) {
        console.error('[Mock Callback V4] ERROR: Database function failed');
        console.error('[Mock Callback V4] Error details:', JSON.stringify(processError, null, 2));
        throw processError;
      }

      if (!result?.success) {
        console.error('[Mock Callback V4] ERROR: Processing failed:', result?.message);
        throw new Error(result?.message || 'Failed to process wallet recharge');
      }

      console.log('[Mock Callback V4] SUCCESS! Wallet recharge processed');
      console.log('[Mock Callback V4] Restaurant ID:', result.restaurant_id);
      console.log('[Mock Callback V4] Amount:', result.amount);
      console.log('[Mock Callback V4] New Status:', result.new_status);
    }

    console.log('[Mock Callback V4] Processing completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Mock Callback V4] ==================== CRITICAL ERROR ====================');
    console.error('[Mock Callback V4] Error type:', typeof error);
    console.error('[Mock Callback V4] Error:', error);

    if (error instanceof Error) {
      console.error('[Mock Callback V4] Error message:', error.message);
      console.error('[Mock Callback V4] Error stack:', error.stack);
    }

    // Try to extract more details if it's a Supabase error
    if (error && typeof error === 'object') {
      console.error('[Mock Callback V4] Error object keys:', Object.keys(error));
      console.error('[Mock Callback V4] Error details:', JSON.stringify(error, null, 2));
    }

    console.error('[Mock Callback V4] =========================================================');

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
