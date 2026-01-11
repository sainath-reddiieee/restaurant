'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, MenuItem } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, ShoppingCart, Plus, Minus, Zap, Gift, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';

export default function RestaurantMenuPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { items: cartItems, addItem, updateQuantity, cartTotal, itemCount } = useCart();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const slug = params.slug as string;

  useEffect(() => {
    fetchRestaurant();
  }, [slug]);

  const fetchRestaurant = async () => {
    const { data: restaurantData, error: restaurantError } = await supabase
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

    const channel = supabase
      .channel('menu-items')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchMenuItems(restaurantId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      const { data, error } = await supabase.rpc('decrement_stock', {
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
      if (remaining > 0) {
        return {
          message: `Add ${formatPrice(remaining)} more for FREE DELIVERY!`,
          isFree: false,
        };
      }
      return {
        message: 'You qualify for FREE DELIVERY!',
        isFree: true,
      };
    }

    return {
      message: `Delivery fee: ${formatPrice(restaurant.delivery_fee)}`,
      isFree: false,
    };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const lootItems = menuItems.filter(item => item.is_clearance);
  const regularItems = menuItems.filter(item => !item.is_clearance);
  const categories = Array.from(new Set(regularItems.map(item => item.category)));
  const deliveryInfo = getDeliveryInfo();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center gap-2 text-white/90 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Restaurants
          </Link>
          <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          {deliveryInfo && (
            <p className="mt-2 text-white/90">{deliveryInfo.message}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {lootItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-6 w-6 text-orange-600" />
              <h2 className="text-2xl font-bold">Late Night Loot</h2>
              <Badge className="bg-orange-600">Limited Stock!</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lootItems.map(item => (
                <Card key={item.id} className="border-2 border-orange-500">
                  <CardHeader>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-40 object-cover rounded-md mb-2"
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {item.is_mystery && <Gift className="h-5 w-5 text-orange-600" />}
                        {item.name}
                      </CardTitle>
                      <Badge className="bg-orange-600">{formatPrice(item.selling_price)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Only {item.stock_remaining} left!</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: `${(item.stock_remaining / (item.stock_remaining + 10)) * 100}%` }}
                        />
                      </div>
                    </div>
                    {getCartQuantity(item.id) > 0 ? (
                      <div className="flex items-center justify-between">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, getCartQuantity(item.id) - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold">{getCartQuantity(item.id)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddToCart(item)}
                          disabled={item.stock_remaining <= 0}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={() => handleAddToCart(item)}
                        disabled={item.stock_remaining <= 0}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        {item.stock_remaining > 0 ? 'Grab Now!' : 'Sold Out'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{category}</h2>
            <div className="space-y-4">
              {regularItems
                .filter(item => item.category === category)
                .map(item => (
                  <Card key={item.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex gap-4 flex-1">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {item.is_mystery && <Gift className="h-4 w-4 text-orange-600" />}
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600">{item.category}</p>
                          <p className="font-semibold text-orange-600 mt-1">
                            {formatPrice(item.selling_price)}
                          </p>
                        </div>
                      </div>
                      {getCartQuantity(item.id) > 0 ? (
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, getCartQuantity(item.id) - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold min-w-[20px] text-center">
                            {getCartQuantity(item.id)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToCart(item)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={() => handleAddToCart(item)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>

      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{itemCount} items</p>
              <p className="text-lg font-bold">{formatPrice(cartTotal)}</p>
            </div>
            <Link href={`/r/${slug}/checkout`}>
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
