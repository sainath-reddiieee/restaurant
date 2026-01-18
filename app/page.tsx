'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { 
  Loader2, Search, ShoppingCart, ChefHat, Clock, MapPin, 
  User, Flame, Bike, Zap, Gift, Sparkles, Utensils, Pizza, Sandwich,
  Navigation, ChevronDown, Bell, CheckCircle2, ArrowRight, X
} from 'lucide-react';
import { formatPrice } from '@/lib/format';

const LIVE_UPDATES = [
  "🔥 Someone nearby just ordered Chicken Biryani",
  "🍕 New order: 2x Large Peppy Paneer Pizzas",
  "🎁 3 people are claiming Mystery Boxes right now",
  "⚡ Flash Sale: Spicy Shawarma is 40% OFF",
  "🛵 12 Riders are active in your area"
];

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [locationName, setLocationName] = useState<string>('Select Location');
  const [manualLocation, setManualLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [currentUpdateIndex, setCurrentUpdateIndex] = useState(0);

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'SUPER_ADMIN') router.push('/admin');
      if (profile.role === 'RESTAURANT') router.push('/dashboard');
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      const [restaurantsResult, lootItemsResult] = await Promise.all([
        supabase.from('restaurants').select('*').eq('is_active', true).order('name'),
        supabase.from('menu_items')
          .select(`*, restaurants!inner(name, slug, is_active)`)
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
      if (lootItemsResult.data) setLootItems(lootItemsResult.data as any);
      setLoading(false);
    };

    fetchData();
    detectLocation();

    const interval = setInterval(() => {
      setCurrentUpdateIndex((prev) => (prev + 1) % LIVE_UPDATES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = restaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
      setFilteredRestaurants(filtered);
    } else {
      setFilteredRestaurants(restaurants);
    }
  }, [searchQuery, restaurants]);

  const detectLocation = () => {
    setIsLocating(true);
    if (!('geolocation' in navigator)) {
      setLocationName('Location Unavailable');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!response.ok) throw new Error('Geocoding failed');
          const data = await response.json();
          const address = data.address;
          const area = address.suburb || address.neighbourhood || address.residential || address.road || '';
          const city = address.city || address.town || address.village || address.county || '';
          const finalLocation = area ? `${area}, ${city}` : city;
          setLocationName(finalLocation || 'Unknown Location');
        } catch (error) {
          console.error('Error fetching address:', error);
          setLocationName('GPS Active');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Location error:', error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const saveManualLocation = () => {
    if (manualLocation.trim()) {
      setLocationName(manualLocation);
      setIsLocationOpen(false);
    }
  };

  const calculateOriginalPrice = (item: LootItem) => {
    if (item.loot_discount_percentage && item.loot_discount_percentage > 0) {
      // Smart Calculation: If discount is 50%, Price is 250, then Original was 500.
      return Math.round(item.selling_price / (1 - (item.loot_discount_percentage / 100)));
    }
    return item.base_price > item.selling_price ? item.base_price : Math.round(item.selling_price * 1.2);
  };

  const mysteryItems = lootItems.filter(item => item.is_mystery);
  const liveLootItems = lootItems.filter(item => !item.is_mystery);

  return (
    <div className="min-h-screen bg-[#f2f4f7] pb-24 font-sans selection:bg-orange-200">
      
      {/* TICKER */}
      <div className="bg-[#111] text-white text-[10px] sm:text-xs font-medium py-2 overflow-hidden relative z-50">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-700 key={currentUpdateIndex}">
          <Bell className="w-3 h-3 text-orange-400 fill-orange-400 animate-pulse" />
          <span className="tracking-wide opacity-90 truncate">
            {LIVE_UPDATES[currentUpdateIndex]}
          </span>
        </div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-6 transition-transform cursor-pointer flex-shrink-0">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col cursor-pointer group min-w-0" onClick={() => setIsLocationOpen(true)}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                  <Navigation className="w-3 h-3" />
                  {isLocating ? 'Detecting...' : 'Delivering To'}
                </div>
                <div className="flex items-center gap-1 text-gray-900 text-sm font-bold group-hover:text-orange-600 transition-colors">
                  <span className="truncate max-w-[150px] sm:max-w-[300px] block">
                    {locationName}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {!user && (
                <Button variant="outline" size="sm" onClick={() => router.push('/partner')} className="hidden sm:flex rounded-full border-gray-200 hover:bg-gray-50 text-xs">
                  Partner Login
                </Button>
              )}
              {itemCount > 0 && (
                <Button size="sm" className="bg-black text-white hover:bg-gray-800 rounded-full px-4 shadow-xl shadow-orange-500/20 transition-transform hover:scale-105 active:scale-95" onClick={() => {
                    const firstRestaurantInCart = JSON.parse(localStorage.getItem('cart') || '[]')[0]?.restaurant_id;
                    if (firstRestaurantInCart) {
                      const restaurant = restaurants.find(r => r.id === firstRestaurantInCart);
                      if (restaurant) router.push(`/r/${restaurant.slug}/checkout`);
                    }
                  }}>
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  <span className="font-bold">{itemCount}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div className="relative bg-[#1a1a1a] text-white pt-10 pb-20 px-4 rounded-b-[2.5rem] shadow-2xl overflow-hidden mb-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[100px] -right-[100px] w-[500px] h-[500px] bg-purple-600/40 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute -bottom-[100px] -left-[100px] w-[500px] h-[500px] bg-orange-600/30 rounded-full blur-[120px] animate-pulse delay-1000"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>
        <div className="relative z-10 container mx-auto text-center max-w-2xl mt-4">
          <Badge className="bg-white/10 text-white border-white/10 backdrop-blur-md mb-6 px-4 py-1.5 text-xs font-medium rounded-full hover:bg-white/20 transition-colors cursor-default">
            🚀 Superfast Delivery in Your City
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight leading-[1.1] drop-shadow-xl">
            Craving something <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Delicious?</span>
          </h1>
          <div className="relative max-w-lg mx-auto group mt-8">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-purple-500 to-red-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative flex items-center bg-white rounded-full p-2 shadow-2xl transform transition-transform group-hover:scale-[1.01]">
              <div className="pl-3 pr-2 text-gray-400"><Search className="w-5 h-5" /></div>
              <input type="text" placeholder="Biryani, Pizza, Cake..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none h-10 text-sm sm:text-base w-full" />
              <Button className="rounded-full px-6 h-10 bg-black hover:bg-gray-900 text-white font-bold text-sm shadow-lg">Search</Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 max-w-7xl -mt-14 relative z-20 space-y-10">
        
        {/* CATEGORIES */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-white/50">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 ml-1">What's on your mind?</h3>
          <div className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar pb-2 px-1">
            {[{ name: 'Biryani', icon: '🥘', color: 'bg-orange-100' }, { name: 'Pizza', icon: '🍕', color: 'bg-red-100' }, { name: 'Burger', icon: '🍔', color: 'bg-yellow-100' }, { name: 'Shawarma', icon: '🥙', color: 'bg-green-100' }, { name: 'Desserts', icon: '🧁', color: 'bg-pink-100' }, { name: 'Healthy', icon: '🥗', color: 'bg-emerald-100' }].map((cat) => (
              <div key={cat.name} className="flex flex-col items-center gap-2 cursor-pointer group min-w-[70px]">
                <div className={`${cat.color} w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm border-2 border-white group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <span className="drop-shadow-sm filter">{cat.icon}</span>
                </div>
                <span className="text-xs font-bold text-gray-600 group-hover:text-black transition-colors">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LOOT SECTION */}
        {(mysteryItems.length > 0 || liveLootItems.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Mystery Box */}
            {mysteryItems.length > 0 && (
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl shadow-indigo-500/20 group cursor-pointer ring-1 ring-white/20 hover:scale-[1.01] transition-transform duration-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <Badge className="bg-white/20 text-white backdrop-blur-md border-0 mb-2 hover:bg-white/30">MYSTERY BOX</Badge>
                      <h2 className="text-2xl font-black text-white tracking-tight">Surprise Savings</h2>
                      <p className="text-indigo-200 text-sm font-medium mt-1">Get premium food at insane prices.</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10"><Gift className="w-6 h-6 text-white animate-bounce" /></div>
                  </div>
                  <div className="space-y-3">
                    {mysteryItems.slice(0, 2).map(item => (
                      <div key={item.id} onClick={() => router.push(`/r/${item.restaurants.slug}`)} className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl flex items-center justify-between hover:bg-white/20 transition-all cursor-pointer border border-white/5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center text-lg shadow-inner">🎁</div>
                          <div>
                            <div className="text-white font-bold text-sm">{item.name}</div>
                            <div className="text-indigo-200 text-xs font-medium">{item.restaurants.name}</div>
                          </div>
                        </div>
                        <Badge className="bg-white text-indigo-700 font-bold px-3">{formatPrice(item.selling_price)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live Loot */}
            {liveLootItems.length > 0 && (
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl shadow-orange-500/20 group cursor-pointer ring-1 ring-white/20 hover:scale-[1.01] transition-transform duration-500">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <Badge className="bg-white text-orange-600 border-0 mb-2 font-bold shadow-lg animate-pulse">LIVE NOW</Badge>
                      <h2 className="text-2xl font-black text-white tracking-tight">Flash Deals</h2>
                      <p className="text-orange-100 text-sm font-medium mt-1">Limited stock. Gone in minutes.</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10"><Zap className="w-6 h-6 text-white" /></div>
                  </div>
                  <div className="space-y-3">
                    {liveLootItems.slice(0, 2).map(item => {
                      const originalPrice = calculateOriginalPrice(item);
                      return (
                        <div key={item.id} onClick={() => router.push(`/r/${item.restaurants.slug}`)} className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl flex items-center justify-between hover:bg-white/20 transition-all cursor-pointer border border-white/5">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 bg-orange-500/30 rounded-xl flex items-center justify-center text-lg shadow-inner">⚡</div>
                            <div>
                              <div className="text-white font-bold text-sm">{item.name}</div>
                              <div className="text-orange-100 text-xs font-medium">{item.restaurants.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-white font-bold text-sm">{formatPrice(item.selling_price)}</span>
                            <span className="block text-orange-200 text-[10px] line-through font-medium">{formatPrice(originalPrice)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESTAURANTS */}
        <div>
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />Popular Near You</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-orange-500" /></div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200 mx-1">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No restaurants found</h3>
              <p className="text-gray-500 text-sm mt-1">Try searching for something else</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
              {filteredRestaurants.map((restaurant, index) => (
                <Card key={restaurant.id} className="group border-0 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden bg-white rounded-[1.5rem] cursor-pointer ring-1 ring-gray-100" onClick={() => router.push(`/r/${restaurant.slug}`)}>
                  <div className="relative h-52 overflow-hidden">
                    {restaurant.image_url ? (
                      <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center"><ChefHat className="w-12 h-12 text-gray-300" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="font-bold text-xl mb-1.5 drop-shadow-md tracking-tight leading-none">{restaurant.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <div className="bg-green-500 text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm"><span className="text-[10px]">★</span> 4.2</div>
                        <span className="opacity-80">• 30-40 mins</span>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                       <Badge className="bg-white/90 text-green-700 backdrop-blur-md shadow-lg border-0 px-2.5 py-0.5 font-bold hover:bg-white text-xs">OPEN</Badge>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between bg-white">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md">Fast Food • Biryani</span>
                     {restaurant.free_delivery_threshold && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100"><Gift className="w-3 h-3" />FREE DELIVERY</div>
                     )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-center pb-2">Select Location</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Button variant="outline" className="w-full justify-start h-12 text-orange-600 border-orange-100 bg-orange-50/50 hover:bg-orange-50 font-bold" onClick={() => { detectLocation(); setIsLocationOpen(false); }}>
              <Navigation className="w-4 h-4 mr-2" />Use Current Location (GPS)
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-background px-2 text-gray-400">Or type manually</span></div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Enter city or area" value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} className="h-11 rounded-xl" />
              <Button size="icon" onClick={saveManualLocation} className="h-11 w-11 rounded-xl bg-black hover:bg-gray-800"><ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}