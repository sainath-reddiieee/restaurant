'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, Order } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Store, DollarSign, Package, Trash2, Shield, Wallet, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';

export default function AdminDashboard() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    owner_phone: '',
    upi_id: '',
    tech_fee: 10,
    delivery_fee: 40,
    free_delivery_threshold: '',
    slug: '',
  });

  // FIX: Proper authentication check with redirect to login or homepage
  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        // Not logged in, redirect to partner login
        router.replace('/partner');
      } else if (profile.role !== 'SUPER_ADMIN') {
        // Logged in but wrong role, redirect to homepage
        router.replace('/');
      }
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN' && loading) {
      fetchRestaurants();
      fetchStats();
    }
  }, [profile, loading]);

  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setRestaurants(data);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { data } = await supabase
      .from('orders')
      .select('net_profit');

    if (data) {
      const revenue = data.reduce((sum, order) => sum + (order.net_profit || 0), 0);
      setTotalRevenue(revenue);
    }

    if (count !== null) {
      setTotalOrders(count);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRestaurants();
      await fetchStats();
      toast({
        title: 'Refreshed',
        description: 'Dashboard data updated',
      });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const insertData = {
      name: formData.name,
      owner_phone: formData.owner_phone.startsWith('+91') ? formData.owner_phone : `+91${formData.owner_phone}`,
      upi_id: formData.upi_id,
      tech_fee: formData.tech_fee,
      delivery_fee: formData.delivery_fee,
      free_delivery_threshold: formData.free_delivery_threshold ? parseInt(formData.free_delivery_threshold) : null,
      slug: formData.slug,
      is_active: true,
    };

    // @ts-ignore
    const { data, error } = await supabase
      .from('restaurants')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Restaurant onboarded successfully!',
      });
      setDialogOpen(false);
      setFormData({
        name: '',
        owner_phone: '',
        upi_id: '',
        tech_fee: 10,
        delivery_fee: 40,
        free_delivery_threshold: '',
        slug: '',
      });
      fetchRestaurants();
      fetchStats();
    }
  };

  const toggleRestaurantStatus = async (id: string, currentStatus: boolean) => {
    // @ts-ignore
    const { error } = await supabase
      .from('restaurants')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Restaurant ${!currentStatus ? 'activated' : 'deactivated'}`,
      });
      fetchRestaurants();
    }
  };

  const deleteRestaurant = async (id: string, name: string) => {
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `${name} has been deleted`,
      });
      fetchRestaurants();
      fetchStats();
    }
  };

  // FIX: Show loading state while authentication or data is loading
  // Prevent rendering dashboard content before authorization check completes
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // FIX: Additional safety check - don't render if not authorized
  if (!profile || profile.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 shadow-xl border-b border-amber-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Admin Command Center</h1>
                <p className="text-amber-100 mt-1">Super Admin Dashboard - Full Platform Control</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/admin/finance">
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                  <Wallet className="h-4 w-4 mr-2" />
                  Finance
                </Button>
              </Link>
              <div className="text-right">
                <p className="text-white font-semibold">{profile?.full_name || 'Admin'}</p>
                <p className="text-amber-100 text-sm">{profile?.phone}</p>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Onboard Restaurant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Onboard New Restaurant</DialogTitle>
                <DialogDescription>
                  Add a new restaurant to the platform with custom configuration
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    placeholder="raju-biryani"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Owner Phone</Label>
                  <Input
                    id="owner_phone"
                    type="tel"
                    placeholder="9876543210"
                    value={formData.owner_phone}
                    onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Critical for WhatsApp notifications</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upi_id">UPI ID</Label>
                  <Input
                    id="upi_id"
                    placeholder="raju@oksbi"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">For UPI payment deep links</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tech_fee">Tech Fee (₹)</Label>
                    <Input
                      id="tech_fee"
                      type="number"
                      value={formData.tech_fee}
                      onChange={(e) => setFormData({ ...formData, tech_fee: parseInt(e.target.value) })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Platform fee per order</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_fee">Delivery Fee (₹)</Label>
                    <Input
                      id="delivery_fee"
                      type="number"
                      value={formData.delivery_fee}
                      onChange={(e) => setFormData({ ...formData, delivery_fee: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="free_delivery_threshold">Free Delivery Threshold (₹)</Label>
                  <Input
                    id="free_delivery_threshold"
                    type="number"
                    placeholder="Leave empty for no free delivery"
                    value={formData.free_delivery_threshold}
                    onChange={(e) => setFormData({ ...formData, free_delivery_threshold: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Minimum order for free delivery</p>
                </div>
                <Button type="submit" className="w-full">Create Restaurant</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Net Profit</CardTitle>
              <DollarSign className="h-5 w-5 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(totalRevenue)}</div>
              <p className="text-xs text-green-100 mt-1">
                Tech Fee + Delivery Margin
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 border-0 text-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Orders</CardTitle>
              <Package className="h-5 w-5 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalOrders}</div>
              <p className="text-xs text-blue-100 mt-1">
                Across all restaurants
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Active Restaurants</CardTitle>
              <Store className="h-5 w-5 text-amber-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{restaurants.filter(r => r.is_active).length}</div>
              <p className="text-xs text-amber-100 mt-1">
                Out of {restaurants.length} total
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Restaurants</CardTitle>
            <CardDescription className="text-slate-400">Manage all onboarded restaurants</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300">Name</TableHead>
                  <TableHead className="text-slate-300">Owner Phone</TableHead>
                  <TableHead className="text-slate-300">Tech Fee</TableHead>
                  <TableHead className="text-slate-300">Delivery Fee</TableHead>
                  <TableHead className="text-slate-300">Free Delivery</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((restaurant) => (
                  <TableRow key={restaurant.id} className="border-slate-700 hover:bg-slate-700/30">
                    <TableCell className="font-medium text-white">{restaurant.name}</TableCell>
                    <TableCell className="text-slate-300">{restaurant.owner_phone}</TableCell>
                    <TableCell className="text-slate-300">{formatPrice(restaurant.tech_fee)}</TableCell>
                    <TableCell className="text-slate-300">{formatPrice(restaurant.delivery_fee)}</TableCell>
                    <TableCell className="text-slate-300">
                      {restaurant.free_delivery_threshold ? formatPrice(restaurant.free_delivery_threshold) : 'None'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={restaurant.is_active}
                          onCheckedChange={() => toggleRestaurantStatus(restaurant.id, restaurant.is_active)}
                        />
                        <Badge variant={restaurant.is_active ? 'default' : 'secondary'}>
                          {restaurant.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {restaurant.name}? This action cannot be undone and will remove all associated menu items, orders, and data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteRestaurant(restaurant.id, restaurant.name)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
