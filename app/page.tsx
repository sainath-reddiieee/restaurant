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
import { 
  Loader2, Search, ShoppingCart, ChefHat, Clock, MapPin, 
  User, Flame, Bike, Zap, Gift, Sparkles, Utensils, Pizza, Sandwich 
} from 'lucide-react';
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

  const mysteryItems = lootItems.filter(item => item.is_mystery);
  const liveLootItems = lootItems.filter(item => !item.is_mystery);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">GO515</h1>
                <p className="text-[10px] font-medium text-orange-600 -mt-1 tracking-wide">LOCAL DELIVERY</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!user && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/rider-signup')}
                    className="hidden md:flex text-sm font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                  >
                    <Bike className="h-4 w-4 mr-2" />
                    Join as Rider
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/partner')}
                    className="hidden md:flex text-sm font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Partner Login
                  </Button>
                </>
              )}
              {itemCount > 0 && (
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all duration-300 rounded-full px-4"
                  onClick={() => {
                    const firstRestaurantInCart = JSON.parse(localStorage.getItem('cart') || '[]')[0]?.restaurant_id;
                    if (firstRestaurantInCart) {
                      const restaurant = restaurants.find(r => r.id === firstRestaurantInCart);
                      if (restaurant) router.push(`/r/${restaurant.slug}/checkout`);
                    }
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  <span className="font-bold">{itemCount}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* NEW MODERN HERO SECTION (Swiggy Style) */}
      <div className="relative bg-[#171a29] text-white pt-12 pb-20 px-4 rounded-b-[2.5rem] shadow-2xl overflow-hidden mb-8">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Pizza className="absolute top-10 right-[10%] w-32 h-32 animate-pulse text-orange-400" />
          <Utensils className="absolute bottom-10 left-[10%] w-24 h-24 text-gray-400 rotate-12" />
          <Sandwich className="absolute top-20 left-[20%] w-16 h-16 text-yellow-400 -rotate-12" />
          <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/50 mb-6 px-4 py-1 text-sm rounded-full backdrop-blur-sm">
            #1 Food Delivery in Tier-2 Cities
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
            Hungry? <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">We got you.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Order from top local restaurants in Anantapur & Tadipatri. Fast delivery, better prices.
          </p>

          {/* Floating Search Bar */}
          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative flex items-center bg-white rounded-full p-2 shadow-2xl">
              <div className="pl-4 pr-3 text-gray-400">
                <Search className="w-6 h-6" />
              </div>
              <input 
                type="text"
                placeholder="Search for biryani, pizza, or restaurant name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 outline-none h-12 text-base md:text-lg w-full"
              />
              <Button className="rounded-full px-8 py-6 bg-orange-600 hover:bg-orange-700 font-bold text-base transition-all hover:scale-105">
                FIND FOOD
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 max-w-7xl -mt-10 relative z-20">
        
        {/* SIDE-BY-SIDE MAGIC BOX & LOOT LAYOUT */}
        {(mysteryItems.length > 0 || liveLootItems.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            
            {/* 1. Mystery Box Section */}
            {mysteryItems.length > 0 && (
              <div className="h-full transform hover:-translate-y-1 transition-transform duration-300">
                <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 sm:p-8 shadow-2xl h-full border border-purple-500/30 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/30 transition-all duration-500"></div>
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                          <Gift className="h-6 w-6 text-purple-300 animate-bounce" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Mystery Boxes</h2>
                      </div>
                      <Badge className="bg-purple-500 hover:bg-purple-400 text-white border-0 px-3 py-1 font-bold shadow-lg shadow-purple-900/50">
                        SURPRISE DEAL
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                      {mysteryItems.map(item => {
                        const autoDiscount = item.base_price > item.selling_price
                          ? Math.round(((item.base_price - item.selling_price) / item.base_price) * 100) : 0;
                        const displayDiscount = item.loot_discount_percentage || autoDiscount;

                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-purple-500/30 transition-all duration-300 group/card border-2 border-transparent hover:border-purple-300"
                            onClick={() => router.push(`/r/${item.restaurants.slug}`)}
                          >
                            <div className="bg-purple-100 p-3 flex justify-between items-start relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-500"></div>
                              <div className="z-10">
                                <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                                <p className="text-xs text-purple-700 font-semibold">{item.restaurants.name}</p>
                              </div>
                              <Badge className="bg-gray-900 text-white text-xs border-0">
                                {formatPrice(item.selling_price)}
                              </Badge>
                            </div>
                            <div className="p-3 bg-white">
                              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-purple-500" />
                                  {item.stock_remaining} left
                                </span>
                                {displayDiscount > 0 && (
                                  <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">{displayDiscount}% OFF</span>
                                )}
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min((item.stock_remaining / 50) * 100, 100)}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Live Loot Mode Section */}
            {liveLootItems.length > 0 && (
              <div className="h-full transform hover:-translate-y-1 transition-transform duration-300">
                <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-3xl p-6 sm:p-8 shadow-2xl h-full border border-orange-400/30 relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl -ml-16 -mb-16 group-hover:bg-orange-400/30 transition-all duration-500"></div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                          <Zap className="h-6 w-6 text-yellow-300 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Live Loot</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <Badge className="bg-white text-red-600 font-bold border-0 px-3 py-1 shadow-lg">LIVE</Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                      {liveLootItems.map(item => {
                        const autoDiscount = item.base_price > item.selling_price
                          ? Math.round(((item.base_price - item.selling_price) / item.base_price) * 100) : 0;
                        const displayDiscount = item.loot_discount_percentage || autoDiscount;

                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-orange-500/30 transition-all duration-300 group/card border-2 border-transparent hover:border-orange-300"
                            onClick={() => router.push(`/r/${item.restaurants.slug}`)}
                          >
                            <div className="bg-orange-50 p-3 flex justify-between items-start relative">
                              <div className="z-10">
                                <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                                <p className="text-xs text-orange-600 font-semibold">{item.restaurants.name}</p>
                              </div>
                              <Badge className="bg-gray-900 text-white text-xs border-0">
                                {formatPrice(item.selling_price)}
                              </Badge>
                            </div>
                            <div className="p-3 bg-white">
                              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                <span className="flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-orange-500" />
                                  {item.stock_remaining} left
                                </span>
                                {displayDiscount > 0 && (
                                  <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">{displayDiscount}% OFF</span>
                                )}
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full" style={{ width: `${Math.min((item.stock_remaining / 50) * 100, 100)}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}

        <div className="flex items-center justify-between mb-8 mt-12">
          <h2 className="text-2xl font-bold text-gray-900">Popular Restaurants</h2>
          <div className="hidden sm:flex gap-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 px-4 py-1">Fast Food</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 px-4 py-1">Biryani</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 px-4 py-1">Desserts</Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No restaurants found</h3>
            <p className="text-gray-500 text-sm">Try searching for something else</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant, index) => (
              <Card
                key={restaurant.id}
                className="overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group border-0 ring-1 ring-gray-100 bg-white rounded-2xl"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => router.push(`/r/${restaurant.slug}`)}
              >
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {restaurant.image_url ? (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-orange-50">
                      <ChefHat className="h-12 w-12 text-orange-200 mb-2" />
                      <span className="text-orange-300 text-xs font-bold uppercase tracking-widest">No Image</span>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/90 text-green-700 backdrop-blur-md shadow-sm border-0 px-3 font-bold hover:bg-white">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      OPEN
                    </Badge>
                  </div>

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-orange-600 transition-colors">
                    {restaurant.name}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span>30-40 min</span>
                    </div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="flex items-center gap-1.5">
                      <Bike className="h-4 w-4 text-orange-500" />
                      <span>₹{restaurant.delivery_fee}</span>
                    </div>
                  </div>

                  {restaurant.free_delivery_threshold && (
                    <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-100">
                      <Gift className="w-3 h-3" />
                      FREE Delivery over ₹{restaurant.free_delivery_threshold}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <section className="container mx-auto px-4 mt-20 mb-12">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-orange-500/20 text-orange-300 font-bold px-4 py-1 rounded-full text-sm mb-6">
                ABOUT US
              </div>
              <h2 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
                Built for <span className="text-orange-500">Tier-2 Cities</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                GO515 connects local restaurants in Anantapur & Tadipatri with food lovers like you. We believe great food delivery shouldn't be limited to metros.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-white mb-2">Late Night Loot</h4>
                  <p className="text-sm text-gray-500">Exclusive flash sales every night.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">No Login Required</h4>
                  <p className="text-sm text-gray-500">Browse and checkout as a guest.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 p-8 rounded-2xl backdrop-blur-sm border border-white/10">
              <h3 className="font-bold text-xl mb-6">Why Choose GO515?</h3>
              <ul className="space-y-4">
                {[
                  "Real-time order tracking",
                  "Direct restaurant prices (No markup)",
                  "Support local businesses",
                  "Fast & reliable delivery fleet"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 bg-green-500/20 p-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}