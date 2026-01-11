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
          router.push('/admin');
          return;
        case 'RESTAURANT':
          router.push('/dashboard');
          return;
      }
    }
  }, [user, profile, authLoading, router]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
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
                  className="relative bg-orange-500 hover:bg-orange-600 animate-in zoom-in duration-300 hover:scale-105 transition-transform shadow-lg"
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
                  <ShoppingCart className="h-4 w-4 mr-1 animate-bounce" />
                  Cart ({itemCount})
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {itemCount}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">Order Food Nearby</h2>
          <p className="text-gray-600 text-sm mb-4 animate-in fade-in delay-150 duration-700">Browse and order without login. Quick Google sign-in only at final checkout.</p>

          <div className="relative animate-in fade-in slide-in-from-bottom-4 delay-300 duration-700">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors" />
            <Input
              type="text"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-base border-2 focus:border-orange-500 transition-all duration-300 focus:shadow-lg"
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
            {filteredRestaurants.map((restaurant, index) => (
              <Card
                key={restaurant.id}
                className="overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer group border-2 border-transparent hover:border-orange-200 animate-in fade-in zoom-in duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => router.push(`/r/${restaurant.slug}`)}
              >
                <div className="relative h-40 bg-gradient-to-br from-orange-100 to-red-100 overflow-hidden">
                  {restaurant.image_url ? (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 group-hover:rotate-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="h-16 w-16 text-orange-300 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 text-white shadow-lg animate-pulse">Open</Badge>
                  </div>
                </div>
                <div className="p-4 group-hover:bg-orange-50/50 transition-colors duration-300">
                  <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-orange-600 transition-colors duration-300">{restaurant.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1 group-hover:text-orange-600 transition-colors duration-300">
                      <Clock className="h-4 w-4" />
                      <span>30-40 min</span>
                    </div>
                    <div className="flex items-center gap-1 group-hover:text-orange-600 transition-colors duration-300">
                      <MapPin className="h-4 w-4" />
                      <span>₹{restaurant.delivery_fee}</span>
                    </div>
                  </div>
                  {restaurant.free_delivery_threshold && (
                    <p className="text-xs text-green-600 mt-2 font-medium animate-in fade-in delay-100">
                      Free delivery on orders above ₹{restaurant.free_delivery_threshold}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 bg-gradient-to-r from-orange-500 via-red-500 to-red-600 rounded-2xl p-6 text-white shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-500">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
              <Flame className="h-6 w-6 animate-bounce" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                Late Night Loot Mode
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full animate-pulse">LIVE</span>
              </h3>
              <p className="text-white/90 text-sm">
                Look for ⚡ flash sale items at massive discounts when browsing restaurant menus. Limited stock, first come first served!
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-12 py-8 bg-white animate-in fade-in slide-in-from-bottom-4 delay-700">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p className="mb-2">Restaurant Partner? <button onClick={() => router.push('/partner')} className="text-orange-600 hover:underline font-medium hover:text-orange-700 transition-colors duration-300">Login here</button></p>
          <p className="text-xs text-gray-500">© 2026 Anantapur. Digital Storefront & Logistics OS for Tier-2 Cities.</p>
        </div>
      </footer>
    </div>
  );
}
