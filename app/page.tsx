'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Search, ShoppingCart, ChefHat, Clock, MapPin, User, Flame } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  is_active: boolean;
}

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && profile) {
      switch (profile.role) {
        case 'SUPER_ADMIN':
          window.location.href = '/admin';
          return;
        case 'RESTAURANT':
          window.location.href = '/dashboard';
          return;
      }
    }
  }, [user, profile, authLoading]);

  useEffect(() => {
    const fetchRestaurants = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (data) {
        setRestaurants(data);
        setFilteredRestaurants(data);
      }
      setLoading(false);
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRestaurants(filtered);
    } else {
      setFilteredRestaurants(restaurants);
    }
  }, [searchQuery, restaurants]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Anantapur</h1>
                <p className="text-xs text-gray-500">Local Food Delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/partner')}
                  className="hidden sm:flex"
                >
                  <User className="h-4 w-4 mr-1" />
                  Partner Login
                </Button>
              )}
              {itemCount > 0 && (
                <Button
                  size="sm"
                  className="relative bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    const firstRestaurantInCart = JSON.parse(localStorage.getItem('cart') || '[]')[0]?.restaurant_id;
                    if (firstRestaurantInCart) {
                      const restaurant = restaurants.find(r => r.id === firstRestaurantInCart);
                      if (restaurant) {
                        router.push(`/r/${restaurant.slug}/checkout`);
                      }
                    }
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Cart ({itemCount})
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Food Nearby</h2>
          <p className="text-gray-600 text-sm mb-4">No login required to browse. Checkout with Google in seconds.</p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-base"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No restaurants found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <Card
                key={restaurant.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => router.push(`/r/${restaurant.slug}`)}
              >
                <div className="relative h-40 bg-gradient-to-br from-orange-100 to-red-100">
                  {restaurant.image_url ? (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="h-16 w-16 text-orange-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 text-white">Open</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 text-gray-900">{restaurant.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>30-40 min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>₹{restaurant.delivery_fee}</span>
                    </div>
                  </div>
                  {restaurant.free_delivery_threshold && (
                    <p className="text-xs text-green-600 mt-2">
                      Free delivery on orders above ₹{restaurant.free_delivery_threshold}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Loot Mode - Flash Sales!</h3>
              <p className="text-white/90 text-sm mb-3">
                Grab excess inventory at massive discounts. Limited stock, first come first served!
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/dashboard/loot')}
                className="bg-white text-orange-600 hover:bg-white/90"
              >
                View Loot Deals
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-12 py-8 bg-white">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p className="mb-2">Restaurant Partner? <button onClick={() => router.push('/partner')} className="text-orange-600 hover:underline font-medium">Login here</button></p>
          <p className="text-xs text-gray-500">© 2026 Anantapur. Digital Storefront & Logistics OS for Tier-2 Cities.</p>
        </div>
      </footer>
    </div>
  );
}
