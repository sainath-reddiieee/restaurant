'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, MenuItem } from '@/lib/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, ShoppingCart, Plus, Minus, Zap, Gift, ArrowLeft, 
  Star, MapPin, Search, ChevronRight, Share2, Info, Clock 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';

// Standard Indian Food Industry Icons
const VegIcon = () => (
  <div className="w-4 h-4 border border-green-600 flex items-center justify-center p-[2px] bg-white rounded-[2px] flex-shrink-0">
    <div className="w-full h-full bg-green-600 rounded-full"></div>
  </div>
);

const NonVegIcon = () => (
  <div className="w-4 h-4 border border-red-600 flex items-center justify-center p-[2px] bg-white rounded-[2px] flex-shrink-0">
    <div className="w-full h-full bg-red-600 rounded-full"></div>
  </div>
);

export default function RestaurantMenuPage() {
  const params = useParams();
  const router = useRouter();
  const { items: cartItems, addItem, updateQuantity, cartTotal, itemCount } = useCart();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const slug = params.slug as string;

  useEffect(() => {
    fetchRestaurant();
  }, [slug]);

  const fetchRestaurant = async () => {
    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (restaurantData) {
      setRestaurant(restaurantData);
      fetchMenuItems(restaurantData.id);
    } else {
      toast({
        title: 'Restaurant not found',
        description: 'This restaurant is not available',
        variant: 'destructive',
      });
      router.push('/');
    }
    setLoading(false);
  };

  const fetchMenuItems = async (restaurantId: string) => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('category', { ascending: true });

    if (data) {
      setMenuItems(data);
    }
  };

  const handleAddToCart = async (item: MenuItem) => {
    if (item.is_clearance && item.stock_remaining <= 0) {
      toast({
        title: 'Out of Stock',
        description: 'This item is no longer available',
        variant: 'destructive',
      });
      return;
    }

    // Optimistic UI update handled by cart provider, but we need to check stock for clearance
    if (item.is_clearance) {
      const { data } = await supabase.rpc('decrement_stock', {
        item_id: item.id,
        quantity: 1,
      });

      if (!data) {
        toast({
          title: 'Out of Stock',
          description: 'Someone just grabbed the last one!',
          variant: 'destructive',
        });
        return;
      }
    }

    addItem(item);
    toast({
      title: 'Added to cart',
      description: `${item.name} added to your cart`,
      duration: 1000,
    });
  };

  const getCartQuantity = (itemId: string) => {
    const cartItem = cartItems.find(i => i.id === itemId);
    return cartItem?.quantity || 0;
  };

  const getDeliveryInfo = () => {
    if (!restaurant) return null;
    if (restaurant.free_delivery_threshold) {
      const remaining = restaurant.free_delivery_threshold - cartTotal;
      if (remaining > 0) return { message: `Add ${formatPrice(remaining)} for FREE DELIVERY`, isFree: false };
      return { message: 'Free Delivery Unlocked!', isFree: true };
    }
    return { message: `Delivery: ${formatPrice(restaurant.delivery_fee)}`, isFree: false };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!restaurant) return null;

  const filteredMenuItems = menuItems.filter(item => {
    if (vegFilter === 'veg') return item.is_veg;
    if (vegFilter === 'non-veg') return !item.is_veg;
    return true;
  });

  const lootItems = filteredMenuItems.filter(item => item.is_clearance);
  const regularItems = filteredMenuItems.filter(item => !item.is_clearance);
  const categories = Array.from(new Set(regularItems.map(item => item.category)));
  const deliveryInfo = getDeliveryInfo();

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-32">
      
      {/* 1. RESTAURANT HEADER */}
      <div className="relative bg-[#171a29] text-white overflow-hidden rounded-b-[2rem] shadow-xl">
        
        {/* Background Image (Blurred) */}
        {restaurant.image_url ? (
          <div className="absolute inset-0 z-0">
            <img 
              src={restaurant.image_url} 
              alt="Background" 
              className="w-full h-full object-cover opacity-40 blur-md scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171a29] via-[#171a29]/80 to-transparent"></div>
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 to-black opacity-90"></div>
        )}

        <div className="relative z-10 container mx-auto px-4 pt-6 pb-8">
          {/* Nav Bar */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="p-2 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-md transition-all border border-white/10">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <div className="flex gap-3">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Restaurant Details */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight leading-tight text-white drop-shadow-lg">
                  {restaurant.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 text-gray-300 text-sm mb-4">
                  {restaurant.location_address && (
                    <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                      <MapPin className="h-3 w-3" /> {restaurant.location_address}
                    </span>
                  )}
                  <span className="px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-bold uppercase">
                    Open Now
                  </span>
                </div>
              </div>
              
              {/* Stats Card */}
              <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 self-start md:self-end shadow-lg">
                <div className="flex flex-col items-center px-4 border-r border-white/10">
                  <div className="flex items-center gap-1 font-bold text-lg text-green-400">
                    <Star className="h-4 w-4 fill-green-400" />
                    {restaurant.rating_avg || 'New'}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">RATING</span>
                </div>
                <div className="flex flex-col items-center px-4">
                  <div className="font-bold text-lg text-white">₹{restaurant.delivery_fee}</div>
                  <span className="text-[10px] text-gray-400 font-medium">DELIVERY</span>
                </div>
              </div>
            </div>

            {/* Delivery Message */}
            {deliveryInfo && (
              <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold backdrop-blur-md border shadow-sm ${
                deliveryInfo.isFree 
                  ? 'bg-green-500/20 border-green-500/30 text-green-100' 
                  : 'bg-blue-500/20 border-blue-500/30 text-blue-100'
              }`}>
                {deliveryInfo.isFree ? <Gift className="h-4 w-4 animate-bounce" /> : <Info className="h-4 w-4" />}
                {deliveryInfo.message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-4 relative z-20 max-w-4xl">
        
        {/* 2. MENU FILTERS */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm py-4 -mx-4 px-4 border-b border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center max-w-4xl mx-auto">
            {/* Veg Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
               {['all', 'veg', 'non-veg'].map((filter) => (
                 <button
                   key={filter}
                   onClick={() => setVegFilter(filter as any)}
                   className={`px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-all ${
                     vegFilter === filter 
                       ? 'bg-white text-gray-900 shadow-sm' 
                       : 'text-gray-500 hover:text-gray-900'
                   }`}
                 >
                   {filter}
                 </button>
               ))}
            </div>

            {/* Categories */}
            <div className="w-full sm:w-auto overflow-x-auto no-scrollbar">
               <div className="flex gap-2">
                 <button
                    onClick={() => setSelectedCategory(null)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                      selectedCategory === null 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    All
                  </button>
                 {categories.map(category => (
                   <button
                     key={category}
                     onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                     className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                       selectedCategory === category 
                         ? 'bg-gray-900 text-white border-gray-900' 
                         : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                     }`}
                   >
                     {category}
                   </button>
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* 3. LIVE LOOT SECTION */}
        {lootItems.length > 0 && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-1.5 rounded-lg shadow-lg shadow-orange-500/30">
                  <Zap className="h-5 w-5 text-white animate-pulse" />
                </div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Late Night Loot</h2>
              </div>
              <Badge variant="destructive" className="animate-pulse px-3 py-1 text-xs">LIVE NOW</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lootItems.map(item => {
                const isMystery = item.is_mystery;
                return (
                  <div key={item.id} className={`relative overflow-hidden rounded-2xl border-2 transition-all hover:scale-[1.01] hover:shadow-xl ${isMystery ? 'border-purple-200 bg-gradient-to-br from-white to-purple-50' : 'border-orange-100 bg-white'}`}>
                    
                    {/* Mystery Banner */}
                    {isMystery && (
                      <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold text-center py-1 tracking-widest z-20">
                        MYSTERY BOX • SURPRISE INSIDE
                      </div>
                    )}

                    <div className={`p-4 relative z-10 flex gap-4 ${isMystery ? 'pt-7' : ''}`}>
                      {/* Text Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {item.is_veg ? <VegIcon /> : <NonVegIcon />}
                          {isMystery && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 h-5 text-[10px]">MYSTERY</Badge>}
                        </div>
                        <h3 className={`font-bold text-lg mb-1 truncate ${isMystery ? 'text-purple-900' : 'text-gray-900'}`}>{item.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{item.loot_description || item.description}</p>
                        
                        <div className="flex items-center gap-2">
                           <span className="font-extrabold text-lg text-gray-900">₹{item.selling_price}</span>
                           <span className="text-xs text-gray-400 line-through font-medium">₹{item.base_price}</span>
                           {item.stock_remaining < 5 && (
                             <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                               Only {item.stock_remaining} left
                             </span>
                           )}
                        </div>
                      </div>
                      
                      {/* Image & Button */}
                      <div className="w-28 flex flex-col items-center gap-2 flex-shrink-0 relative">
                        <div className="w-28 h-24 rounded-xl overflow-hidden shadow-md bg-gray-100 relative">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover ${isMystery ? 'blur-[2px] brightness-90' : ''}`} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              {isMystery ? <Gift className="h-8 w-8 text-purple-300" /> : <Zap className="h-8 w-8 text-orange-200" />}
                            </div>
                          )}
                          {isMystery && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Gift className="h-8 w-8 text-white drop-shadow-lg animate-bounce" />
                            </div>
                          )}
                        </div>
                        
                        {/* Add Button */}
                        <div className="w-full absolute -bottom-3">
                           {getCartQuantity(item.id) > 0 ? (
                              <div className="flex items-center justify-between bg-white border border-green-200 shadow-lg rounded-lg h-9 overflow-hidden">
                                <button onClick={() => updateQuantity(item.id, getCartQuantity(item.id) - 1)} className="w-8 h-full flex items-center justify-center hover:bg-green-50 text-green-700 transition-colors"><Minus className="w-3 h-3" /></button>
                                <span className="text-sm font-bold text-green-700">{getCartQuantity(item.id)}</span>
                                <button onClick={() => handleAddToCart(item)} className="w-8 h-full flex items-center justify-center hover:bg-green-50 text-green-700 transition-colors"><Plus className="w-3 h-3" /></button>
                              </div>
                           ) : (
                              <button 
                                onClick={() => handleAddToCart(item)}
                                disabled={item.stock_remaining <= 0}
                                className={`w-full h-9 rounded-lg font-bold text-sm shadow-lg uppercase tracking-wide transition-all active:scale-95 ${
                                  item.stock_remaining <= 0 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                    : 'bg-white text-green-600 border border-green-200 hover:bg-green-50'
                                }`}
                              >
                                {item.stock_remaining <= 0 ? 'SOLD' : 'ADD'}
                              </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. MAIN MENU ITEMS */}
        {categories.filter(cat => selectedCategory === null || cat === selectedCategory).map(category => (
          <div key={category} className="mb-8 scroll-mt-28" id={`category-${category}`}>
            <h3 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              {category}
              <span className="w-full h-[1px] bg-gray-200 ml-2"></span>
            </h3>
            
            <div className="space-y-6">
              {regularItems.filter(item => item.category === category).map(item => (
                <div key={item.id} className="group bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex justify-between gap-4">
                  
                  {/* Left Side: Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {item.is_veg ? <VegIcon /> : <NonVegIcon />}
                        {item.is_bestseller && (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                            BESTSELLER
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-800 text-base mb-1 group-hover:text-orange-600 transition-colors">{item.name}</h4>
                      <div className="font-bold text-gray-900 text-sm">₹{item.selling_price}</div>
                    </div>
                    {item.description && (
                      <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mt-2 font-medium">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Right Side: Image & Add Button */}
                  <div className="w-32 h-28 flex-shrink-0 relative flex flex-col items-center">
                    <div className="w-32 h-24 rounded-xl overflow-hidden bg-gray-50">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <ShoppingCart className="h-6 w-6 opacity-20" />
                        </div>
                      )}
                    </div>

                    {/* Floating Add Button */}
                    <div className="absolute -bottom-2 w-28">
                       {getCartQuantity(item.id) > 0 ? (
                          <div className="flex items-center justify-between bg-white border border-gray-200 shadow-lg rounded-lg h-8 overflow-hidden">
                            <button onClick={() => updateQuantity(item.id, getCartQuantity(item.id) - 1)} className="w-8 h-full flex items-center justify-center hover:bg-green-50 text-gray-600 transition-colors"><Minus className="w-3 h-3" /></button>
                            <span className="text-sm font-bold text-green-700">{getCartQuantity(item.id)}</span>
                            <button onClick={() => handleAddToCart(item)} className="w-8 h-full flex items-center justify-center hover:bg-green-50 text-green-700 transition-colors"><Plus className="w-3 h-3" /></button>
                          </div>
                       ) : (
                          <button 
                             onClick={() => handleAddToCart(item)}
                             className="w-full h-8 bg-white text-green-600 font-extrabold text-sm shadow-md rounded-lg border border-gray-200 hover:bg-green-50 uppercase tracking-wide transition-all hover:shadow-lg active:scale-95"
                          >
                             ADD
                          </button>
                       )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Empty State */}
        {menuItems.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
             <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <Search className="h-8 w-8 text-gray-400" />
             </div>
             <h3 className="text-lg font-bold text-gray-900">Menu not available</h3>
             <p className="text-gray-500 text-sm mt-1">Please try again later or check another restaurant.</p>
          </div>
        )}

      </div>

      {/* 5. FLOATING CART STRIP */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="max-w-4xl mx-auto bg-[#60b246] hover:bg-[#53a639] text-white p-3.5 rounded-xl shadow-2xl shadow-green-900/30 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]" onClick={() => router.push(`/r/${slug}/checkout`)}>
            <div className="flex flex-col pl-2">
               <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{itemCount} ITEMS ADDED</span>
               <span className="text-lg font-extrabold">₹{cartTotal} <span className="text-xs font-normal ml-1 opacity-90">+ taxes</span></span>
            </div>
            <div className="flex items-center gap-2 font-bold pr-2 text-sm bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors">
               View Cart <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}