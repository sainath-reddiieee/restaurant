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
import { Loader2, Search, ShoppingCart, ChefHat, Clock, MapPin, User, Flame, Bike, Zap, Gift, Sparkles } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  is_active: boolean;
}

interface LootItem {
  id: string;
  name: string;
  selling_price: number;
  base_price: number;
  stock_remaining: number;
  is_mystery: boolean;
  loot_discount_percentage: number | null;
  loot_description: string | null;
  image_url: string | null;
  restaurant_id: string;
  restaurants: {
    name: string;
    slug: string;
  };
}

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [lootItems, setLootItems] = useState<LootItem[]>([]);
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
    const fetchData = async () => {
      const [restaurantsResult, lootItemsResult] = await Promise.all([
        supabase
          .from('restaurants')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('menu_items')
          .select(`
            *,
            restaurants!inner(name, slug, is_active)
          `)
          .eq('is_clearance', true)
          .eq('is_available', true)
          .eq('restaurants.is_active', true)
          .gt('stock_remaining', 0)
          .order('stock_remaining', { ascending: true })
          .limit(6)
      ]);

      if (restaurantsResult.data) {
        setRestaurants(restaurantsResult.data);
        setFilteredRestaurants(restaurantsResult.data);
      }

      if (lootItemsResult.data) {
        setLootItems(lootItemsResult.data as any);
      }

      setLoading(false);
    };

    fetchData();
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
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
                <ChefHat className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Anantapur</h1>
                <p className="text-[10px] sm:text-xs text-gray-500 -mt-0.5">Local Food Delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {!user && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/rider-signup')}
                    className="hidden md:flex text-xs sm:text-sm px-2 sm:px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  >
                    <Bike className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Become a Rider
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/partner')}
                    className="hidden md:flex text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Partner Login
                  </Button>
                </>
              )}
              {itemCount > 0 && (
                <Button
                  size="sm"
                  className="relative bg-orange-500 hover:bg-orange-600 animate-in zoom-in duration-300 hover:scale-105 transition-transform shadow-lg text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
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
                  <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Cart </span>({itemCount})
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        <div className="mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">Order Food Nearby</h2>
          <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 animate-in fade-in delay-150 duration-700">Browse restaurants and add items to cart. Login only required at checkout.</p>

          <div className="relative animate-in fade-in slide-in-from-bottom-4 delay-300 duration-700">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-colors" />
            <Input
              type="text"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 py-4 sm:py-6 text-sm sm:text-base border-2 focus:border-orange-500 transition-all duration-300 focus:shadow-lg"
            />
          </div>
        </div>

        {lootItems.filter(item => item.is_mystery).length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 delay-400 duration-700">
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Gift className="h-8 w-8 text-white animate-bounce" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Mystery Boxes</h2>
                    <Badge className="bg-white text-purple-600 font-bold animate-pulse">SURPRISE!</Badge>
                  </div>
                </div>
                <p className="text-white/90 mb-6 text-sm sm:text-base">
                  Open a mystery box and discover amazing surprises at unbeatable prices!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lootItems.filter(item => item.is_mystery).map(item => {
                    const autoDiscount = item.base_price > item.selling_price
                      ? Math.round(((item.base_price - item.selling_price) / item.base_price) * 100)
                      : 0;
                    const displayDiscount = item.loot_discount_percentage || autoDiscount;

                    return (
                      <Card
                        key={item.id}
                        className="overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-white/50 bg-gradient-to-br from-white to-purple-50"
                        onClick={() => router.push(`/r/${item.restaurants.slug}`)}
                      >
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs py-1.5 px-3 text-center font-bold animate-pulse">
                          MYSTERY BOX - SURPRISE INSIDE!
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Gift className="h-5 w-5 text-purple-600" />
                                <h3 className="font-bold text-base line-clamp-1">{item.name}</h3>
                              </div>
                              <p className="text-xs text-purple-600 mb-2 font-medium">{item.restaurants.name}</p>
                              {item.loot_description && (
                                <p className="text-sm text-gray-700 line-clamp-2 mb-2 bg-purple-50 p-2 rounded border border-purple-200">
                                  {item.loot_description}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge className="bg-purple-600 text-base px-3">
                                {formatPrice(item.selling_price)}
                              </Badge>
                              {displayDiscount > 0 && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs font-bold">
                                  {displayDiscount}% OFF
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 flex items-center gap-1 font-medium">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                Only {item.stock_remaining} boxes left!
                              </span>
                              {item.stock_remaining <= 5 && (
                                <Badge variant="destructive" className="text-[10px] px-2 py-0.5 animate-pulse">
                                  Almost Gone!
                                </Badge>
                              )}
                            </div>
                            <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse"
                                style={{ width: `${Math.min((item.stock_remaining / 50) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {lootItems.filter(item => !item.is_mystery).length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 delay-500 duration-700">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-7 w-7 text-white animate-pulse" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Live Loot Mode</h2>
                  <Badge className="bg-white text-orange-600 font-bold animate-pulse">LIVE NOW</Badge>
                </div>
              </div>
              <p className="text-white/90 mb-6 text-sm sm:text-base">
                Flash deals with limited stock - grab them before they're gone!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lootItems.filter(item => !item.is_mystery).map(item => {
                  const autoDiscount = item.base_price > item.selling_price
                    ? Math.round(((item.base_price - item.selling_price) / item.base_price) * 100)
                    : 0;
                  const displayDiscount = item.loot_discount_percentage || autoDiscount;

                  return (
                    <Card
                      key={item.id}
                      className="overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-white/50 bg-white"
                      onClick={() => router.push(`/r/${item.restaurants.slug}`)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="h-4 w-4 text-orange-600" />
                              <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                            </div>
                            <p className="text-xs text-orange-600 mb-1 font-medium">{item.restaurants.name}</p>
                            {item.loot_description && (
                              <p className="text-xs text-gray-600 line-clamp-1 mb-2">{item.loot_description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className="bg-orange-600 text-sm">
                              {formatPrice(item.selling_price)}
                            </Badge>
                            {displayDiscount > 0 && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs font-bold">
                                {displayDiscount}% OFF
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {item.stock_remaining} left
                            </span>
                            {item.stock_remaining <= 5 && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">
                                Almost Gone!
                              </Badge>
                            )}
                          </div>
                          <div className="w-full bg-orange-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all bg-gradient-to-r from-orange-500 to-red-500"
                              style={{ width: `${Math.min((item.stock_remaining / 50) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No restaurants found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredRestaurants.map((restaurant, index) => (
              <Card
                key={restaurant.id}
                className="overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer group border-2 border-transparent hover:border-orange-200 animate-in fade-in zoom-in duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => router.push(`/r/${restaurant.slug}`)}
              >
                <div className="relative h-32 sm:h-40 bg-gradient-to-br from-orange-100 to-red-100 overflow-hidden">
                  {restaurant.image_url ? (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 group-hover:rotate-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="h-12 w-12 sm:h-16 sm:w-16 text-orange-300 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                    <Badge className="bg-green-500 text-white shadow-lg animate-pulse text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">Open</Badge>
                  </div>
                </div>
                <div className="p-3 sm:p-4 group-hover:bg-orange-50/50 transition-colors duration-300">
                  <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2 text-gray-900 group-hover:text-orange-600 transition-colors duration-300">{restaurant.name}</h3>
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1 group-hover:text-orange-600 transition-colors duration-300">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>30-40 min</span>
                    </div>
                    <div className="flex items-center gap-1 group-hover:text-orange-600 transition-colors duration-300">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>₹{restaurant.delivery_fee}</span>
                    </div>
                  </div>
                  {restaurant.free_delivery_threshold && (
                    <p className="text-[10px] sm:text-xs text-green-600 mt-1.5 sm:mt-2 font-medium animate-in fade-in delay-100">
                      Free delivery above ₹{restaurant.free_delivery_threshold}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 sm:mt-12 bg-gradient-to-r from-orange-500 via-red-500 to-red-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-500">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 animate-bounce" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2 flex flex-wrap items-center gap-2">
                Late Night Loot Mode
                <span className="text-[10px] sm:text-xs bg-white/20 px-2 py-0.5 sm:py-1 rounded-full animate-pulse">LIVE</span>
              </h3>
              <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                Look for ⚡ flash sale items at massive discounts when browsing restaurant menus. Limited stock, first come first served!
              </p>
            </div>
          </div>
        </div>
      </main>

      <section className="mt-8 sm:mt-12 bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 animate-in fade-in slide-in-from-bottom-4 delay-600">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">About Anantapur OS</h2>
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 text-sm sm:text-base">
          <div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Anantapur is a hyperlocal food delivery platform designed specifically for tier-2 and tier-3 cities. We connect local restaurants with customers through a seamless digital storefront experience.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Our platform features innovative Late Night Loot Mode for flash sales, guest checkout for convenience, and powerful restaurant management tools.
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 sm:p-6">
            <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-3 sm:mb-4">Key Features</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Browse without login, checkout as guest</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Late Night Loot Mode for flash sales</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Real-time order tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Multiple payment options</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-6 sm:mt-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg animate-in fade-in slide-in-from-bottom-4 delay-700">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Contact Us</h2>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 text-sm sm:text-base">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 text-orange-400">Phone</h3>
            <p className="text-white/90">+91 9441414140</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 text-orange-400">Email</h3>
            <p className="text-white/90">support@anantapur.local</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 text-orange-400">Location</h3>
            <p className="text-white/90">Anantapur, Andhra Pradesh</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 mt-8 sm:mt-12 py-6 sm:py-8 bg-white animate-in fade-in slide-in-from-bottom-4 delay-800">
        <div className="container mx-auto px-3 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
          {!user && (
            <p className="mb-2">Restaurant Partner? <button onClick={() => router.push('/partner')} className="text-orange-600 hover:underline font-medium hover:text-orange-700 transition-colors duration-300">Login here</button></p>
          )}
          <p className="text-[10px] sm:text-xs text-gray-500">© 2026 Anantapur. Digital Storefront & Logistics OS for Tier-2 Cities.</p>
        </div>
      </footer>
    </div>
  );
}
