'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Store, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function MenuListPage() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'CUSTOMER')) {
      router.push('/');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role === 'CUSTOMER') {
      fetchRestaurants();
    }
  }, [profile]);

  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (data) {
      setRestaurants(data);
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GO515</h1>
            <p className="text-sm text-gray-600">Discover local restaurants</p>
          </div>
          <Button variant="ghost" onClick={signOut}>Logout</Button>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-6xl">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Available Restaurants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map(restaurant => (
            <Link key={restaurant.id} href={`/r/${restaurant.slug}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Store className="h-6 w-6 text-orange-600" />
                    <Badge className="bg-green-100 text-green-800">Open</Badge>
                  </div>
                  <CardTitle className="text-xl">{restaurant.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    GO515
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    {restaurant.free_delivery_threshold ? (
                      <p className="text-green-600 font-medium">
                        Free delivery on orders above ₹{restaurant.free_delivery_threshold}
                      </p>
                    ) : (
                      <p>Delivery fee: ₹{restaurant.delivery_fee}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {restaurants.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Store className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No restaurants available at the moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
