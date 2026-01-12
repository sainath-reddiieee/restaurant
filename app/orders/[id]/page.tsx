'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Order, Restaurant } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, Clock, ChefHat, Package, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const orderId = params.id as string;

  const [pendingPayment, setPendingPayment] = useState<any>(null);

  useEffect(() => {
    const paymentData = localStorage.getItem('pending_payment');
    if (paymentData) {
      const payment = JSON.parse(paymentData);
      if (payment.orderId === orderId) {
        setPendingPayment(payment);
        localStorage.removeItem('pending_payment');
      }
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    const query = supabase
      .from('orders')
      .select('*')
      .eq('id', orderId);

    if (profile) {
      query.eq('customer_id', profile.id);
    }

    const { data: orderData, error } = await query.maybeSingle();

    if (orderData) {
      setOrder(orderData);
      fetchRestaurant(orderData.restaurant_id);

      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            setOrder(payload.new as Order);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    setLoading(false);
  };

  const fetchRestaurant = async (restaurantId: string) => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .maybeSingle();

    if (data) {
      setRestaurant(data);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: any; label: string; color: string; description: string }> = {
      PENDING: {
        icon: Clock,
        label: 'Order Received',
        color: 'text-gray-600',
        description: 'Your order has been received and is being confirmed',
      },
      CONFIRMED: {
        icon: CheckCircle,
        label: 'Confirmed',
        color: 'text-blue-600',
        description: 'Your order has been confirmed by the restaurant',
      },
      COOKING: {
        icon: ChefHat,
        label: 'Preparing',
        color: 'text-orange-600',
        description: 'Your delicious food is being prepared',
      },
      READY: {
        icon: Package,
        label: 'Ready for Pickup',
        color: 'text-green-600',
        description: 'Your order is ready and will be delivered soon',
      },
      DELIVERED: {
        icon: CheckCircle,
        label: 'Delivered',
        color: 'text-green-700',
        description: 'Your order has been delivered. Enjoy your meal!',
      },
    };
    return configs[status] || configs.PENDING;
  };

  const getStatusStep = (status: string): number => {
    const steps: Record<string, number> = {
      PENDING: 1,
      CONFIRMED: 2,
      COOKING: 3,
      READY: 4,
      DELIVERED: 5,
    };
    return steps[status] || 1;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!order || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Order not found</p>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const currentStep = getStatusStep(order.status);
  const StatusIcon = statusConfig.icon;

  const statuses = ['PENDING', 'CONFIRMED', 'COOKING', 'READY', 'DELIVERED'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/menu" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Restaurants
          </Link>
          <h1 className="text-2xl font-bold mt-2">Order Tracking</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {pendingPayment && (
          <Card className="mb-6 border-2 border-orange-500 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-xl text-orange-900">Complete Payment</CardTitle>
              <CardDescription>Pay {formatPrice(pendingPayment.amount)} to confirm your order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">UPI Payment Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">UPI ID:</span>
                    <span className="font-mono font-semibold">{pendingPayment.restaurantUPI}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">{formatPrice(pendingPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Note:</span>
                    <span className="font-semibold">{pendingPayment.orderShortId}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>How to pay on Desktop:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                  <li>Open any UPI app on your phone (Google Pay, PhonePe, Paytm, etc.)</li>
                  <li>Select "Pay to UPI ID" or "Send Money"</li>
                  <li>Enter UPI ID: <strong>{pendingPayment.restaurantUPI}</strong></li>
                  <li>Enter amount: <strong>{formatPrice(pendingPayment.amount)}</strong></li>
                  <li>Add note: <strong>{pendingPayment.orderShortId}</strong></li>
                  <li>Complete the payment</li>
                </ol>
                <p className="text-xs text-gray-500 mt-3">
                  Note: Adding the order ID in the payment note helps the restaurant verify your payment quickly.
                </p>
              </div>
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  navigator.clipboard.writeText(pendingPayment.restaurantUPI);
                  toast({
                    title: 'Copied!',
                    description: 'UPI ID copied to clipboard',
                  });
                }}
              >
                Copy UPI ID
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{order.short_id}</CardTitle>
                <CardDescription>{restaurant.name}</CardDescription>
              </div>
              <div className={`p-3 rounded-full bg-orange-100`}>
                <StatusIcon className={`h-8 w-8 ${statusConfig.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold ${statusConfig.color}`}>{statusConfig.label}</h3>
              <p className="text-sm text-gray-600">{statusConfig.description}</p>
            </div>

            <div className="relative">
              {statuses.map((status, index) => {
                const step = index + 1;
                const isCompleted = step <= currentStep;
                const isCurrent = step === currentStep;
                const config = getStatusConfig(status);
                const StepIcon = config.icon;

                return (
                  <div key={status} className="flex items-center mb-4 last:mb-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 bg-white relative z-10"
                         style={{
                           borderColor: isCompleted ? '#f97316' : '#e5e7eb',
                           backgroundColor: isCompleted ? '#fff7ed' : 'white',
                         }}>
                      <StepIcon
                        className={`h-5 w-5 ${isCompleted ? 'text-orange-600' : 'text-gray-400'}`}
                      />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                        {config.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-gray-600">{config.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Items</h4>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm mb-1">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(order.total_amount - order.delivery_fee_charged)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({order.coupon_code})</span>
                  <span>-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{order.delivery_fee_charged === 0 ? 'FREE' : formatPrice(order.delivery_fee_charged)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Payment Method: </span>
                <Badge variant="outline">
                  {order.payment_method === 'PREPAID_UPI' ? '✅ Paid Online' :
                   order.payment_method === 'COD_CASH' ? 'Cash on Delivery' :
                   'UPI on Delivery'}
                </Badge>
              </div>
              <div>
                <span className="font-semibold">Delivery Address: </span>
                <p className="text-gray-600 mt-1">{order.delivery_address}</p>
              </div>
              {order.voice_note_url && (
                <div>
                  <span className="font-semibold">Voice Instructions:</span>
                  <audio controls className="w-full mt-2">
                    <source src={order.voice_note_url} type="audio/webm" />
                  </audio>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button asChild className="w-full" variant="outline">
          <Link href="/menu">
            <Home className="mr-2 h-4 w-4" />
            Back to Restaurants
          </Link>
        </Button>
      </div>
    </div>
  );
}
