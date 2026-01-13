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
  Star, Clock, MapPin, Search, ChevronRight, Share2, Info 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';

// Standard Indian Food Industry Icons
const VegIcon = () => (
  <div className="w-4 h-4 border border-green-600 flex items-center justify-center p-[2px] bg-white rounded-[2px]">
    <div className="w-full h-full bg-green-600 rounded-full"></div>
  </div>
);

const NonVegIcon = () => (
  <div className="w-4 h-4 border border-red-600 flex items-center justify-center p-[2px] bg-white rounded-[2px]">
    <div className="w-full h-full bg-red-600 rounded-full"></div>
  </div>
);

export default function RestaurantMenuPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
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
      router.push('/menu');
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
      duration: 1500,
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
    <div className="min-h-screen bg-[#f4f5f7] pb-28">
      
      {/* 1. HERO HEADER (Dark Theme) */}
      <div className="bg-[#171a29] text-white pb-8 rounded-b-[2rem] shadow-xl relative overflow-hidden">
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

        <div className="container mx-auto px-4 pt-6 relative z-10">
          {/* Nav Bar */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <div className="flex gap-3">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Restaurant Info */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold mb-2 tracking-tight">{restaurant.name}</h1>
                <p className="text-gray-400 text-sm md:text-base flex items-center gap-2">
                  <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">Premium</span>
                  • North Indian • Chinese • Biryani
                </p>
              </div>
              
              {/* Stats Card */}
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
                <div className="flex flex-col items-center px-3 border-r border-white/10">
                  <div className="flex items-center gap-1 font-bold text-lg text-green-400">
                    <Star className="h-4 w-4 fill-green-400" />
                    {restaurant.rating_avg}
                  </div>
                  <span className="text-[10px] text-gray-400">Rating</span>
                </div>
                <div className="flex flex-col items-center px-3 border-r border-white/10">
                  <div className="font-bold text-lg">35</div>
                  <span className="text-[10px] text-gray-400">Mins</span>
                </div>
                <div className="flex flex-col items-center px-3">
                  <div className="font-bold text-lg">₹{restaurant.delivery_fee}</div>
                  <span className="text-[10px] text-gray-400">Delivery</span>
                </div>
              </div>
            </div>

            {deliveryInfo && !deliveryInfo.isFree && (
              <div className="mt-6 inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-200 px-4 py-2 rounded-lg text-sm">
                <Info className="h-4 w-4" />
                {deliveryInfo.message}
              </div>
            )}
            {deliveryInfo?.isFree && (
              <div className="mt-6 inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-2 rounded-lg text-sm font-semibold animate-pulse">
                <Gift className="h-4 w-4" />
                Free Delivery Unlocked!
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6 relative z-20 max-w-4xl">
        
        {/* 2. FILTERS & TOGGLES */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg self-start">
             <button
               onClick={() => setVegFilter('all')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${vegFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
             >
               All
             </button>
             <button
               onClick={() => setVegFilter('veg')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${vegFilter === 'veg' ? 'bg-green-50 text-green-700 shadow-sm border border-green-100' : 'text-gray-500 hover:text-green-600'}`}
             >
               Veg
             </button>
             <button
               onClick={() => setVegFilter('non-veg')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${vegFilter === 'non-veg' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-gray-500 hover:text-red-600'}`}
             >
               Non-Veg
             </button>
          </div>

          {/* Category Scroll */}
          {categories.length > 0 && (
             <div className="overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
               <div className="flex gap-2">
                 {categories.map(category => (
                   <button
                     key={category}
                     onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                     className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                       selectedCategory === category 
                         ? 'bg-gray-900 text-white border-gray-900' 
                         : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                     }`}
                   >
                     {category}
                   </button>
                 ))}
               </div>
             </div>
          )}
        </div>

        {/* 3. LOOT SECTION (Horizontal Scroll) */}
        {lootItems.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-1.5 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Late Night Loot</h2>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lootItems.map(item => {
                const isMystery = item.is_mystery;
                return (
                  <div key={item.id} className={`relative overflow-hidden rounded-2xl border-2 transition-all hover:scale-[1.01] ${isMystery ? 'border-purple-200 bg-purple-50' : 'border-orange-100 bg-white'}`}>
                    {/* Background Pattern */}
                    {isMystery && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-100/50 via-transparent to-transparent"></div>}
                    
                    <div className="p-4 relative z-10 flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.is_veg ? <VegIcon /> : <NonVegIcon />}
                          {isMystery && <span className="text-[10px] font-bold bg-purple-600 text-white px-1.5 rounded">MYSTERY</span>}
                        </div>
                        <h3 className={`font-bold text-lg mb-1 ${isMystery ? 'text-purple-900' : 'text-gray-900'}`}>{item.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.loot_description || item.description}</p>
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-lg">₹{item.selling_price}</span>
                           <span className="text-xs text-gray-400 line-through">₹{item.base_price}</span>
                        </div>
                      </div>
                      
                      <div className="w-28 h-28 relative flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl shadow-md" />
                        ) : (
                          <div className={`w-full h-full rounded-xl flex items-center justify-center ${isMystery ? 'bg-purple-100' : 'bg-orange-50'}`}>
                             {isMystery ? <Gift className="h-10 w-10 text-purple-400" /> : <Zap className="h-10 w-10 text-orange-300" />}
                          </div>
                        )}
                        
                        {/* Add Button Overlay */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                           {getCartQuantity(item.id) > 0 ? (
                              <div className="flex items-center bg-white border border-gray-200 shadow-lg rounded-lg h-9 overflow-hidden">
                                <button onClick={() => updateQuantity(item.id, getCartQuantity(item.id) - 1)} className="px-2 hover:bg-gray-100 h-full flex items-center"><Minus className="w-3 h-3 text-gray-600" /></button>
                                <span className="px-2 text-sm font-bold text-green-600">{getCartQuantity(item.id)}</span>
                                <button onClick={() => handleAddToCart(item)} className="px-2 hover:bg-gray-100 h-full flex items-center"><Plus className="w-3 h-3 text-green-600" /></button>
                              </div>
                           ) : (
                              <button 
                                onClick={() => handleAddToCart(item)}
                                disabled={item.stock_remaining <= 0}
                                className={`h-9 px-6 rounded-lg font-bold text-sm shadow-lg uppercase tracking-wide transition-transform active:scale-95 ${item.stock_remaining <= 0 ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-white text-green-600 border border-gray-200 hover:bg-gray-50'}`}
                              >
                                {item.stock_remaining <= 0 ? 'SOLD' : 'ADD'}
                              </button>
                           )}
                        </div>
                      </div>
                    </div>
                    {item.stock_remaining < 5 && item.stock_remaining > 0 && (
                      <div className="bg-red-50 text-red-600 text-[10px] font-bold text-center py-0.5">
                        Almost Gone! Only {item.stock_remaining} left
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. MAIN MENU LIST */}
        {categories.filter(cat => selectedCategory === null || cat === selectedCategory).map(category => (
          <div key={category} className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              {category} 
              <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {regularItems.filter(i => i.category === category).length}
              </span>
            </h3>
            
            <div className="space-y-6">
              {regularItems.filter(item => item.category === category).map(item => (
                <div key={item.id} className="group flex justify-between gap-4 pb-6 border-b border-dashed border-gray-200 last:border-0 relative">
                  
                  {/* Left Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {item.is_veg ? <VegIcon /> : <NonVegIcon />}
                      {item.is_bestseller && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1 rounded">BESTSELLER</span>}
                    </div>
                    <h4 className="font-bold text-gray-800 text-base mb-0.5">{item.name}</h4>
                    <div className="font-medium text-gray-700 text-sm mb-2">₹{item.selling_price}</div>
                    {item.description && <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{item.description}</p>}
                  </div>

                  {/* Right Image & Button */}
                  <div className="relative w-32 h-28 flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
                        <div className="text-center opacity-30">
                          <ChefHat className="h-6 w-6 mx-auto mb-1" />
                        </div>
                      </div>
                    )}

                    {/* Add Button - Absolute Positioned */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[85%]">
                       {getCartQuantity(item.id) > 0 ? (
                          <div className="flex items-center justify-between bg-white border border-green-200 shadow-md rounded-lg h-8 overflow-hidden">
                            <button onClick={() => updateQuantity(item.id, getCartQuantity(item.id) - 1)} className="w-8 h-full flex items-center justify-center hover:bg-green-50 text-gray-600"><Minus className="w-3 h-3" /></button>
                            <span className="text-sm font-bold text-green-700">{getCartQuantity(item.id)}</span>
                            <button onClick={() => handleAddToCart(item)} className="w-8 h-full flex items-center justify-center hover:bg-green-50 text-green-700"><Plus className="w-3 h-3" /></button>
                          </div>
                       ) : (
                          <button 
                             onClick={() => handleAddToCart(item)}
                             className="w-full h-8 bg-white text-green-600 font-bold text-sm shadow-md rounded-lg border border-gray-200 hover:bg-gray-50 uppercase tracking-wide"
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
          <div className="text-center py-12">
             <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
               <ChefHat className="h-8 w-8 text-gray-400" />
             </div>
             <p className="text-gray-500">Menu not available right now.</p>
          </div>
        )}

      </div>

      {/* 5. FLOATING CART STRIP */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="max-w-4xl mx-auto bg-[#60b246] text-white p-3 rounded-xl shadow-2xl shadow-green-900/20 flex items-center justify-between cursor-pointer hover:bg-[#53a639] transition-colors" onClick={() => router.push(`/r/${slug}/checkout`)}>
            <div className="flex flex-col pl-2">
               <span className="text-xs font-medium uppercase opacity-90">{itemCount} items added</span>
               <span className="text-lg font-bold">₹{cartTotal} <span className="text-xs font-normal ml-1 opacity-80">(plus taxes)</span></span>
            </div>
            <div className="flex items-center gap-2 font-bold pr-2">
               View Cart <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}