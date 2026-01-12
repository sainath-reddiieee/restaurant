import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({
        error: 'Phone number is required. Use ?phone=XXXXXXXXXX'
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({
        error: 'Database error fetching profile',
        details: profileError
      }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({
        error: 'Profile not found for phone: ' + phone
      }, { status: 404 });
    }

    let restaurantData = null;
    let transactionsData = null;

    // If restaurant user, fetch restaurant and transaction data
    if (profile.role === 'RESTAURANT') {
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_phone', phone)
        .maybeSingle();

      if (restaurant) {
        restaurantData = restaurant;

        // Fetch wallet transactions
        const { data: transactions } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false })
          .limit(10);

        transactionsData = transactions;
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        profile: {
          id: profile.id,
          phone: profile.phone,
          full_name: profile.full_name,
          role: profile.role,
          wallet_balance: profile.wallet_balance,
          created_at: profile.created_at
        },
        restaurant: restaurantData ? {
          id: restaurantData.id,
          name: restaurantData.name,
          credit_balance: restaurantData.credit_balance,
          min_balance_limit: restaurantData.min_balance_limit,
          is_active: restaurantData.is_active,
          owner_phone: restaurantData.owner_phone
        } : null,
        recent_transactions: transactionsData,
        summary: {
          profile_type: profile.role,
          wallet_source: profile.role === 'RESTAURANT' ? 'restaurants.credit_balance' : 'profiles.wallet_balance',
          current_balance: profile.role === 'RESTAURANT' ? restaurantData?.credit_balance : profile.wallet_balance,
          transaction_count: transactionsData?.length || 0
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[Debug Wallet] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
