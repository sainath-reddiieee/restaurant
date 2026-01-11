'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, Order } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, Package, Clock, CheckCircle, ChefHat } from 'lucide-react';
import { formatPrice, generateWhatsAppMessage, generateWhatsAppLink } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function RestaurantDashboard() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);

  // FIX: Prevent redirect loops by checking auth state properly
  // Only redirect when auth loading is complete and user is unauthorized
  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.role !== 'RESTAURANT') {
        router.replace('/');  // Use replace to prevent back button issues
      }
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (profile?.role === 'RESTAURANT') {
      fetchRestaurant();
    }
  }, [profile]);

  const fetchRestaurant = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_phone', profile!.phone)
      .maybeSingle();

    if (data) {
      setRestaurant(data);
      fetchOrders(data.id);
    } else {
      toast({
        title: 'Error',
        description: 'Restaurant not found. Please contact support.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const fetchOrders = async (restaurantId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data);
      const sales = data.reduce((sum, order) => sum + (order.total_amount - order.net_profit), 0);
      setTotalSales(sales);
    }

    const channel = supabase
      .channel('restaurant-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          fetchOrders(restaurantId);
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New Order!',
              description: `Order ${(payload.new as Order).short_id} received`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Order status updated to ${newStatus}`,
      });
    }
  };

  const sendToWhatsApp = (order: Order) => {
    const message = generateWhatsAppMessage({
      shortId: order.short_id,
      customerName: 'Customer',
      customerPhone: profile?.phone || '',
      items: order.items,
      couponCode: order.coupon_code,
      discountAmount: order.discount_amount,
      subtotal: order.total_amount - order.delivery_fee_charged,
      deliveryFee: order.delivery_fee_charged,
      total: order.total_amount,
      paymentMethod: order.payment_method,
      isPrepaid: order.payment_method === 'PREPAID_UPI',
      voiceNoteUrl: order.voice_note_url,
      gpsCoordinates: order.gps_coordinates,
    });

    const whatsappUrl = generateWhatsAppLink(restaurant!.owner_phone, message);
    window.open(whatsappUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      CONFIRMED: { variant: 'default', label: 'Confirmed' },
      COOKING: { variant: 'outline', label: 'Cooking' },
      READY: { variant: 'default', label: 'Ready' },
      DELIVERED: { variant: 'outline', label: 'Delivered' },
    };
    const config = variants[status] || variants.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      PENDING: 'CONFIRMED',
      CONFIRMED: 'COOKING',
      COOKING: 'READY',
      READY: 'DELIVERED',
    };
    return flow[currentStatus] || null;
  };

  const filterOrders = (status: string) => {
    return orders.filter(order => order.status === status);
  };

  // FIX: Proper loading state with message
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-blue-900 text-sm">Loading restaurant dashboard...</p>
        </div>
      </div>
    );
  }

  // FIX: Additional authorization check before rendering
  if (!profile || profile.role !== 'RESTAURANT') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-blue-900 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
        <div className="text-center">
          <p className="text-blue-900 text-lg font-semibold mb-2">Restaurant not found</p>
          <p className="text-blue-700 text-sm">Please contact support for assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg border-b-2 border-blue-700">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <ChefHat className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
              <p className="text-sm text-blue-100">Restaurant Operations Hub</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/menu">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">Menu</Button>
            </Link>
            <Link href="/dashboard/loot">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">Loot Mode</Button>
            </Link>
            <Link href="/dashboard/coupons">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">Coupons</Button>
            </Link>
            <Button className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500 to-green-600 border-0 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Sales</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(totalSales)}</div>
              <p className="text-xs text-emerald-100">Revenue before delivery fees</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Orders</CardTitle>
              <Package className="h-5 w-5 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{orders.length}</div>
              <p className="text-xs text-blue-100">All time orders</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 border-0 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Pending Orders</CardTitle>
              <Clock className="h-5 w-5 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{filterOrders('PENDING').length}</div>
              <p className="text-xs text-orange-100">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-white shadow-md border border-blue-100">
            <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Pending ({filterOrders('PENDING').length})</TabsTrigger>
            <TabsTrigger value="confirmed" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Confirmed ({filterOrders('CONFIRMED').length})</TabsTrigger>
            <TabsTrigger value="cooking" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Cooking ({filterOrders('COOKING').length})</TabsTrigger>
            <TabsTrigger value="ready" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Ready ({filterOrders('READY').length})</TabsTrigger>
            <TabsTrigger value="delivered" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Delivered ({filterOrders('DELIVERED').length})</TabsTrigger>
          </TabsList>

          {['PENDING', 'CONFIRMED', 'COOKING', 'READY', 'DELIVERED'].map(status => (
            <TabsContent key={status} value={status.toLowerCase()} className="space-y-4">
              {filterOrders(status).map(order => (
                <Card key={order.id} className="bg-white shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-blue-900">{order.short_id}</CardTitle>
                        <CardDescription>
                          {new Date(order.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Items:</h4>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    {order.coupon_code && (
                      <div className="text-sm text-green-600">
                        Coupon: {order.coupon_code} (Saved {formatPrice(order.discount_amount)})
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total to Collect:</span>
                        <span className="text-lg">{formatPrice(order.total_amount)}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Payment: {order.payment_method === 'PREPAID_UPI' ? '✅ PAID ONLINE' : '⚠️ COLLECT'}
                      </div>
                    </div>
                    {order.voice_note_url && (
                      <div>
                        <audio controls className="w-full">
                          <source src={order.voice_note_url} type="audio/webm" />
                        </audio>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {getNextStatus(order.status) && (
                        <Button
                          onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          Mark as {getNextStatus(order.status)}
                        </Button>
                      )}
                      {order.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          onClick={() => sendToWhatsApp(order)}
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          Send to WhatsApp
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filterOrders(status).length === 0 && (
                <Card className="bg-white shadow-md">
                  <CardContent className="py-8 text-center text-gray-500">
                    No {status.toLowerCase()} orders
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
