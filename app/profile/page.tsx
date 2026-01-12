'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Phone,
  Mail,
  Wallet,
  History,
  MapPin,
  HeadphonesIcon,
  LogOut,
  ChevronRight,
  AlertCircle,
  Package
} from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  wallet_balance: number;
  role: string;
}

interface Order {
  id: string;
  short_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: any;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrders, setShowOrders] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || '');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersData) {
        setOrders(ordersData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Profile Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">Unable to load your profile.</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-600 mt-1">Manage your account and view your activity</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Identity Card
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Full Name</p>
                      <p className="font-medium text-slate-900">{profile.full_name || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium text-slate-900">{email || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="font-medium text-slate-900">{profile.phone}</p>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="self-start">
                  {profile.role === 'CUSTOMER' || profile.role === 'STUDENT' ? 'Customer' : profile.role}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {profile.role === 'RESTAURANT' ? 'Partner Wallet' : profile.role === 'SUPER_ADMIN' ? 'Admin Wallet' : 'Vello Wallet'}
              </CardTitle>
              <CardDescription>
                {profile.role === 'RESTAURANT'
                  ? 'Your restaurant earnings and balance'
                  : profile.role === 'SUPER_ADMIN'
                  ? 'Admin account wallet balance'
                  : 'Your wallet balance for refunds and rewards'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Available Balance</p>
                <p className="text-4xl font-bold text-slate-900">
                  {formatPrice(profile.wallet_balance)}
                </p>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-900 leading-relaxed">
                  <strong>How does the wallet work?</strong>
                  <br />
                  {profile.role === 'RESTAURANT' ? (
                    <>Your wallet contains earnings from completed orders. Payment settlements and withdrawals can be managed from your partner dashboard.</>
                  ) : (
                    <>Your wallet balance can be used to reduce payment amounts at checkout. Money is added to your wallet through order refunds and platform rewards only. You cannot directly add money to your wallet.</>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile.role === 'RESTAURANT' && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-between hover:bg-slate-100"
                    onClick={() => router.push('/dashboard')}
                  >
                    <span className="flex items-center gap-3">
                      <Package className="h-5 w-5" />
                      Restaurant Dashboard
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-between hover:bg-slate-100"
                    onClick={() => router.push('/partner/wallet')}
                  >
                    <span className="flex items-center gap-3">
                      <Wallet className="h-5 w-5" />
                      Wallet & Transactions
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Separator />
                </>
              )}
              {profile.role === 'SUPER_ADMIN' && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-between hover:bg-slate-100"
                    onClick={() => router.push('/admin')}
                  >
                    <span className="flex items-center gap-3">
                      <Package className="h-5 w-5" />
                      Admin Dashboard
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-between hover:bg-slate-100"
                    onClick={() => router.push('/admin/finance')}
                  >
                    <span className="flex items-center gap-3">
                      <Wallet className="h-5 w-5" />
                      Finance Management
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Separator />
                </>
              )}
              {(profile.role === 'CUSTOMER' || profile.role === 'STUDENT') && (
                <Button
                  variant="ghost"
                  className="w-full justify-between hover:bg-slate-100"
                  onClick={() => setShowOrders(!showOrders)}
                >
                  <span className="flex items-center gap-3">
                    <History className="h-5 w-5" />
                    Order History
                    <Badge variant="secondary">{orders.length}</Badge>
                  </span>
                  <ChevronRight className={`h-5 w-5 transition-transform ${showOrders ? 'rotate-90' : ''}`} />
                </Button>
              )}

              {showOrders && (
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No orders yet</p>
                      <Button
                        variant="link"
                        onClick={() => router.push('/menu')}
                        className="mt-2"
                      >
                        Start ordering
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <Card key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/orders/${order.id}`)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{order.short_id}</p>
                                <p className="text-sm text-slate-600">
                                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatPrice(order.total_amount)}</p>
                                <Badge variant={order.status === 'DELIVERED' ? 'default' : 'secondary'}>
                                  {order.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}

              <Separator />

              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-slate-100"
                onClick={() => router.push('/')}
              >
                <span className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" />
                  Saved Addresses
                </span>
                <ChevronRight className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-slate-100"
                onClick={() => router.push('/')}
              >
                <span className="flex items-center gap-3">
                  <HeadphonesIcon className="h-5 w-5" />
                  Support
                </span>
                <ChevronRight className="h-5 w-5" />
              </Button>

              <Separator />

              <Button
                variant="destructive"
                className="w-full justify-center gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
