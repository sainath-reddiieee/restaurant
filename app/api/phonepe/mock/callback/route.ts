// Updated: 2026-01-12 14:50 - Use database function for atomic updates
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });
}

export async function POST(req: NextRequest) {
  console.log('[Mock Callback V5] Starting callback processing...');
  let supabase;

  try {
    console.log('[Mock Callback V5] Step 1: Parsing request body...');
    const body = await req.json();
    const { merchantTransactionId, status, amount } = body;

    console.log('[Mock Callback V5] Step 2: Request parsed successfully:', {
      merchantTransactionId,
      status,
      amount,
      timestamp: new Date().toISOString()
    });

    console.log('[Mock Callback V5] Step 3: Initializing Supabase client...');
    supabase = getSupabaseClient();
    console.log('[Mock Callback V5] Step 4: Supabase client ready');

    // Update order status based on payment result
    if (merchantTransactionId.startsWith('order_') || merchantTransactionId.startsWith('ORDER-')) {
      console.log('[Mock Callback V5] Step 5: Processing order payment...');

      // For ORDER- format, extract the order ID
      // Format: ORDER-{uuid}-{timestamp}
      let orderId = null;
      if (merchantTransactionId.startsWith('ORDER-')) {
        const parts = merchantTransactionId.split('-');
        // Parts: ['ORDER', uuid part 1, uuid part 2, uuid part 3, uuid part 4, uuid part 5, timestamp]
        orderId = parts.slice(1, 6).join('-'); // Reconstruct UUID
        console.log('[Mock Callback V5] ORDER format - Extracted order ID:', orderId);
      }

      console.log('[Mock Callback V5] Calling database function to process payment...');
      let result;
      let processError;

      try {
        const rpcResult = await supabase.rpc('process_order_payment', {
          order_id_param: orderId,
          merchant_txn_id: merchantTransactionId,
          payment_status: status
        });

        result = rpcResult.data;
        processError = rpcResult.error;
      } catch (err) {
        console.error('[Mock Callback V5] Exception during RPC call:', err);
        processError = err;
      }

      console.log('[Mock Callback V5] Database function result:', {
        success: result?.success,
        message: result?.message,
        order_id: result?.order_id,
        new_status: result?.new_status,
        error: processError ? 'ERROR' : 'NO ERROR'
      });

      if (processError) {
        console.error('[Mock Callback V5] ERROR: Database function failed');
        console.error('[Mock Callback V5] Error details:', JSON.stringify(processError, null, 2));
        throw processError;
      }

      if (!result?.success) {
        console.error('[Mock Callback V5] ERROR: Processing failed:', result?.message);
        return NextResponse.json({
          success: false,
          message: result?.message || 'Failed to process order payment'
        }, { status: result?.message?.includes('not found') ? 404 : 500 });
      }

      console.log('[Mock Callback V5] ✓ SUCCESS! Order payment processed');
      console.log('[Mock Callback V5] Order ID:', result.order_id);
      console.log('[Mock Callback V5] New Status:', result.new_status);
    }
    // Handle wallet recharge
    else if (merchantTransactionId.startsWith('RECHARGE-')) {
      console.log('[Mock Callback V5] Step 5: Processing wallet recharge...');

      // Extract transaction ID from RECHARGE-{uuid}-{timestamp}
      // Format: RECHARGE-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-timestamp
      // UUID has 5 parts, so we need parts[1] through parts[5]
      const parts = merchantTransactionId.split('-');
      const walletTxnId = parts.slice(1, 6).join('-'); // Reconstruct UUID from parts

      console.log('[Mock Callback V5] Full transaction ID:', merchantTransactionId);
      console.log('[Mock Callback V5] Parts after split:', parts);
      console.log('[Mock Callback V5] Extracted wallet transaction ID:', walletTxnId);

      console.log('[Mock Callback V5] Step 6: Querying wallet transaction from database...');
      let walletTxn;
      let walletTxnError;

      try {
        const result = await supabase
          .from('wallet_transactions')
          .select('restaurant_id, amount, id')
          .eq('id', walletTxnId)
          .maybeSingle();

        walletTxn = result.data;
        walletTxnError = result.error;
      } catch (err) {
        console.error('[Mock Callback V5] Exception during wallet txn fetch:', err);
        walletTxnError = err;
      }

      console.log('[Mock Callback V5] Step 7: Database query result:', {
        found: !!walletTxn,
        error: walletTxnError ? 'ERROR' : 'NO ERROR',
        walletTxnId
      });

      if (walletTxnError || !walletTxn) {
        console.error('[Mock Callback V5] ERROR: Wallet transaction not found or error occurred');
        console.error('[Mock Callback V5] Error details:', walletTxnError);
        throw walletTxnError || new Error('Wallet transaction not found');
      }

      console.log('[Mock Callback V5] Step 8: Calling database function to process recharge...');
      console.log('[Mock Callback V5] Wallet Transaction ID:', walletTxnId);
      console.log('[Mock Callback V5] Payment Transaction ID:', merchantTransactionId);
      console.log('[Mock Callback V5] Payment Status:', status);

      let result;
      let processError;

      try {
        const rpcResult = await supabase.rpc('process_wallet_recharge', {
          wallet_txn_id: walletTxnId,
          payment_txn_id: merchantTransactionId,
          payment_status: status
        });

        result = rpcResult.data;
        processError = rpcResult.error;
      } catch (err) {
        console.error('[Mock Callback V5] Exception during RPC call (wallet):', err);
        processError = err;
      }

      console.log('[Mock Callback V5] Step 9: Database function result:', {
        success: result?.success,
        message: result?.message,
        error: processError ? 'ERROR' : 'NO ERROR'
      });

      if (processError) {
        console.error('[Mock Callback V5] ERROR: Database function failed');
        console.error('[Mock Callback V5] Error details:', JSON.stringify(processError, null, 2));
        throw processError;
      }

      if (!result?.success) {
        console.error('[Mock Callback V5] ERROR: Processing failed:', result?.message);
        throw new Error(result?.message || 'Failed to process wallet recharge');
      }

      console.log('[Mock Callback V5] ✓ SUCCESS! Wallet recharge processed');
      console.log('[Mock Callback V5] Restaurant ID:', result.restaurant_id);
      console.log('[Mock Callback V5] Amount:', result.amount);
      console.log('[Mock Callback V5] New Status:', result.new_status);
    }

    console.log('[Mock Callback V5] Processing completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Mock Callback V5] ==================== CRITICAL ERROR ====================');
    console.error('[Mock Callback V5] Error type:', typeof error);
    console.error('[Mock Callback V5] Error:', error);

    if (error instanceof Error) {
      console.error('[Mock Callback V5] Error message:', error.message);
      console.error('[Mock Callback V5] Error stack:', error.stack);
    }

    // Try to extract more details if it's a Supabase error
    if (error && typeof error === 'object') {
      console.error('[Mock Callback V5] Error object keys:', Object.keys(error));
      console.error('[Mock Callback V5] Error details:', JSON.stringify(error, null, 2));
    }

    console.error('[Mock Callback V5] =========================================================');

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
