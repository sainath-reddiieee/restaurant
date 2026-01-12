'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, WalletTransaction } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Wallet, AlertCircle, CheckCircle, Clock, XCircle, Plus, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PartnerWalletPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'RESTAURANT')) {
      router.push('/login');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role === 'RESTAURANT') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_phone', profile!.phone)
        .maybeSingle();

      if (restaurantData) {
        setRestaurant(restaurantData);
        fetchTransactions(restaurantData.id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (restaurantId: string) => {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (data) {
      setTransactions(data);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;

    const amount = parseInt(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount < 100) {
      toast({
        title: 'Minimum Amount',
        description: 'Minimum recharge amount is ₹100',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create wallet transaction record first
      const { data: transaction, error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          restaurant_id: restaurant.id,
          amount,
          type: 'WALLET_RECHARGE',
          status: 'PENDING',
          notes: notes || 'PhonePe payment gateway recharge',
        })
        .select()
        .single();

      if (txnError || !transaction) {
        throw new Error('Failed to create transaction record');
      }

      // Initiate PhonePe payment
      const transactionId = `RECHARGE-${transaction.id}-${Date.now()}`;

      const response = await fetch('/api/phonepe/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          transactionId,
          mobileNumber: profile.phone,
          userId: profile.id,
          type: 'RECHARGE',
        }),
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        // Redirect to PhonePe payment page
        window.location.href = data.redirectUrl;
      } else {
        // Delete the transaction if payment initiation failed
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('id', transaction.id);

        throw new Error(data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Error initiating recharge:', error);
      toast({
        title: 'Recharge Failed',
        description: error instanceof Error ? error.message : 'Failed to initiate recharge. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Restaurant not found</p>
      </div>
    );
  }

  const balanceStatus = restaurant.credit_balance >= 0 ? 'positive' :
                       restaurant.credit_balance >= restaurant.min_balance_limit ? 'warning' : 'critical';

  const canAcceptOrders = restaurant.credit_balance >= restaurant.min_balance_limit;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/partner" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Wallet Management</h1>
          <p className="text-gray-600">{restaurant.name}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {!canAcceptOrders && (
          <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Restaurant Suspended</h3>
              <p className="text-sm text-red-700 mt-1">
                Your wallet balance is below the minimum limit. Please recharge immediately to accept new orders.
              </p>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Current Balance
            </CardTitle>
            <CardDescription>Your prepaid credit balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold" style={{
                    color: balanceStatus === 'positive' ? '#16a34a' :
                           balanceStatus === 'warning' ? '#f59e0b' : '#dc2626'
                  }}>
                    {formatPrice(restaurant.credit_balance)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Minimum limit: {formatPrice(restaurant.min_balance_limit)}
                  </p>
                </div>
                <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Recharge Wallet
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Recharge Wallet</DialogTitle>
                      <DialogDescription>
                        Pay securely using PhonePe Payment Gateway
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRecharge} className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">Instant Recharge</h4>
                        </div>
                        <p className="text-sm text-blue-700">
                          Your wallet will be recharged instantly after successful payment via PhonePe.
                          Minimum recharge: ₹100
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="amount">Recharge Amount (₹)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          placeholder="Enter amount (min ₹100)"
                          required
                          min="100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum: ₹100 | Maximum: ₹1,00,000
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add reference or notes..."
                          rows={2}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Proceed to Pay ₹{rechargeAmount || '0'}
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-center text-gray-500">
                        Powered by PhonePe Payment Gateway (Secure)
                      </p>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹{restaurant.tech_fee}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Tech Fee per Order</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.floor(Math.abs(restaurant.min_balance_limit) / restaurant.tech_fee)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Orders on Credit</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold" style={{
                    color: canAcceptOrders ? '#16a34a' : '#dc2626'
                  }}>
                    {canAcceptOrders ? 'Active' : 'Suspended'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Status</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All wallet transactions and recharge requests</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => {
                  const isDeduction = transaction.type === 'FEE_DEDUCTION';
                  const statusConfig = {
                    PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending' },
                    APPROVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
                    REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
                  }[transaction.status];

                  const StatusIcon = statusConfig.icon;

                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isDeduction ? 'bg-red-100' : 'bg-green-100'}`}>
                          {isDeduction ? (
                            <ArrowDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <ArrowUp className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {isDeduction ? 'Tech Fee Deduction' : 'Wallet Recharge'}
                          </p>
                          {transaction.notes && (
                            <p className="text-sm text-gray-600">{transaction.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <p className={`text-lg font-semibold ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                          {isDeduction ? '-' : '+'}{formatPrice(Math.abs(transaction.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
