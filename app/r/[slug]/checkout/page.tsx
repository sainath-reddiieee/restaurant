'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, Coupon } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { VoiceRecorder } from '@/components/voice-recorder';
import { Loader2, MapPin, Tag, CreditCard, Wallet, QrCode, ArrowLeft, Trash2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import { calculateGST, type GSTBreakdown } from '@/lib/gst-calculator';
import Link from 'next/link';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  // Added removeItem and clearCart from hook
  const { items: cartItems, cartTotal, clearCart, removeItem, isInitialized: cartInitialized } = useCart();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState<string | null>(null);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PREPAID_UPI' | 'COD_CASH' | 'COD_UPI_SCAN'>('COD_CASH');
  const [useWallet, setUseWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [guestPhone, setGuestPhone] = useState('');
  const [guestName, setGuestName] = useState('');

  const slug = params.slug as string;

  useEffect(() => {
    if (!cartInitialized) return;

    if (cartItems.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add items to your cart first',
        variant: 'destructive',
      });
      router.push(`/r/${slug}`);
      return;
    }

    if (!authLoading) {
      fetchRestaurant();
      getLocation();
      if (profile) {
        fetchWalletBalance();
      }
    }
  }, [slug, cartItems.length, authLoading, profile, cartInitialized, router]); // Added router dependency

  const fetchWalletBalance = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', profile.id)
      .maybeSingle();

    if (data) {
      setWalletBalance(data.wallet_balance || 0);
    }
  };

  const fetchRestaurant = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setRestaurant(data);
    }
    setLoading(false);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoordinates(`${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const applyCoupon = async () => {
    if (!restaurant) return;

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Invalid Coupon',
        description: 'Coupon code not found or expired',
        variant: 'destructive',
      });
      return;
    }

    if (cartTotal < data.min_order_value) {
      toast({
        title: 'Minimum order not met',
        description: `Minimum order value is ${formatPrice(data.min_order_value)}`,
        variant: 'destructive',
      });
      return;
    }

    setAppliedCoupon(data);
    toast({
      title: 'Coupon applied!',
      description: `You saved ${formatPrice(data.discount_value)}`,
    });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const calculateTotal = (): GSTBreakdown => {
    const discount = appliedCoupon?.discount_value || 0;

    let deliveryFee = 0;
    if (restaurant?.free_delivery_threshold) {
      deliveryFee = cartTotal >= restaurant.free_delivery_threshold ? 0 : restaurant.delivery_fee;
    } else {
      deliveryFee = restaurant?.delivery_fee || 0;
    }

    const gstBreakdown = calculateGST(
      cartTotal,
      deliveryFee,
      discount,
      walletBalance,
      useWallet,
      undefined,
      restaurant?.gst_enabled ?? true
    );

    return gstBreakdown;
  };

  const placeOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast({
        title: 'Address required',
        description: 'Please enter your delivery address',
        variant: 'destructive',
      });
      return;
    }

    if (!profile && !guestPhone.trim()) {
      toast({
        title: 'Phone required',
        description: 'Please enter your phone number for delivery updates',
        variant: 'destructive',
      });
      return;
    }

    if (!restaurant) return;

    setSubmitting(true);

    try {
      let customerId = profile?.id;

      if (!profile) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', guestPhone)
          .maybeSingle();

        if (existingProfile) {
          customerId = existingProfile.id;
        } else {
          const guestUserId = crypto.randomUUID();
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: guestUserId,
              role: 'CUSTOMER',
              phone: guestPhone,
              full_name: guestName || 'Guest',
            })
            .select()
            .single();

          if (profileError) {
            console.error('Failed to create guest profile:', profileError);
            toast({
              title: 'Error',
              description: profileError.message || 'Failed to create guest profile. Please try again or login.',
              variant: 'destructive',
            });
            setSubmitting(false);
            return;
          }

          customerId = newProfile.id;
        }
      }

      if (!customerId) {
        toast({
          title: 'Error',
          description: 'Unable to identify customer. Please try again.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const gstBreakdown = calculateTotal();

      const { data: shortIdData } = await supabase.rpc('generate_short_id');
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

      const techFee = restaurant.tech_fee * cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const deliveryMargin = gstBreakdown.deliveryFeeAfterGST > 0 ? gstBreakdown.deliveryFeeAfterGST - 30 : 0;
      const netProfit = techFee + deliveryMargin;

      const orderItems = cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.selling_price,
        quantity: item.quantity,
        is_mystery: item.is_mystery,
      }));

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          short_id: shortIdData || `ANT-${Date.now()}`,
          invoice_number: invoiceNumber || `INV-${Date.now()}`,
          restaurant_id: restaurant.id,
          customer_id: customerId,
          status: 'PENDING',
          payment_method: paymentMethod,
          voice_note_url: voiceNoteUrl || null,
          gps_coordinates: gpsCoordinates,
          delivery_address: deliveryAddress,
          subtotal_before_gst: gstBreakdown.subtotalBeforeGST,
          food_gst_amount: gstBreakdown.foodGSTAmount,
          delivery_gst_amount: gstBreakdown.deliveryGSTAmount,
          total_gst_amount: gstBreakdown.totalGSTAmount,
          cgst_amount: gstBreakdown.cgstAmount,
          sgst_amount: gstBreakdown.sgstAmount,
          total_amount: gstBreakdown.grandTotal,
          delivery_fee_charged: gstBreakdown.deliveryFeeAfterGST,
          coupon_code: appliedCoupon?.code || null,
          discount_amount: gstBreakdown.discountAmount,
          net_profit: netProfit,
          items: orderItems,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      if (gstBreakdown.walletDeduction > 0 && profile) {
        const { error: walletError } = await supabase
          .from('profiles')
          .update({ wallet_balance: walletBalance - gstBreakdown.walletDeduction })
          .eq('id', profile.id);

        if (walletError) {
          console.error('Error updating wallet:', walletError);
        }
      }

      clearCart();
      toast({
        title: 'Order placed!',
        description: `Your order ${order.short_id} has been placed successfully`,
      });

      if (paymentMethod === 'PREPAID_UPI' && gstBreakdown.amountToPay > 0) {
        try {
          const phoneNumber = profile?.phone || guestPhone;
          const transactionId = `ORDER-${order.id}-${Date.now()}`;

          await supabase
            .from('orders')
            .update({
              payment_transaction_id: transactionId,
              payment_status: 'pending'
            })
            .eq('id', order.id);

          const response = await fetch('/api/phonepe/initiate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: gstBreakdown.amountToPay,
              transactionId,
              mobileNumber: phoneNumber,
              userId: customerId,
              type: 'ORDER',
            }),
          });

          const data = await response.json();

          if (data.success && data.redirectUrl) {
            window.location.href = data.redirectUrl;
          } else {
            throw new Error(data.error || 'Failed to initiate payment');
          }
        } catch (paymentError) {
          console.error('Payment initiation error:', paymentError);
          toast({
            title: 'Payment Error',
            description: paymentError instanceof Error ? paymentError.message : 'Failed to initiate payment. Please try again.',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
      } else {
        router.push(`/orders/${order.id}`);
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const totals = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/r/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>
          <h1 className="text-xl font-bold mt-2">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="mb-6 shadow-sm border-gray-100">
          <CardHeader className="pb-3 border-b border-gray-50 flex flex-row items-center justify-between">
            <CardTitle>Order Summary</CardTitle>
            {cartItems.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearCart}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-8"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Clear Cart
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {cartItems.map(item => {
              const isLoot = item.base_price > item.selling_price;
              const savings = (item.base_price - item.selling_price) * item.quantity;
              
              return (
                <div key={item.id} className="flex justify-between items-start group">
                  <div className="flex gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-800">{item.quantity}x</span>
                        <span className="font-medium text-sm text-gray-700">{item.name}</span>
                        {item.is_mystery && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded font-bold">MYSTERY</span>
                        )}
                      </div>
                      {isLoot && (
                        <span className="text-[10px] text-green-600 font-medium mt-0.5">
                          You saved {formatPrice(savings)}!
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-sm text-gray-900">{formatPrice(item.selling_price * item.quantity)}</div>
                      {isLoot && (
                        <div className="text-[10px] text-gray-400 line-through decoration-gray-400">
                          {formatPrice(item.base_price * item.quantity)}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 -mr-2 transition-colors"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Separator className="my-2" />

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(totals.subtotalBeforeGST)}</span>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>GST (5% Food)</span>
                <span>{formatPrice(totals.foodGSTAmount)}</span>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Fee</span>
                {totals.deliveryFeeAfterGST === 0 ? (
                  <span className="text-green-600 font-medium">FREE</span>
                ) : (
                  <span>{formatPrice(totals.deliveryFeeAfterGST)}</span>
                )}
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span>-{formatPrice(totals.discountAmount)}</span>
                </div>
              )}
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span>
              <span>{formatPrice(totals.grandTotal)}</span>
            </div>

            {useWallet && totals.walletDeduction > 0 && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-100 mt-2">
                <div className="flex justify-between text-green-700 text-sm font-medium mb-1">
                  <span>Wallet Balance Used</span>
                  <span>-{formatPrice(totals.walletDeduction)}</span>
                </div>
                <Separator className="bg-green-200 my-2" />
                <div className="flex justify-between font-bold text-base text-green-800">
                  <span>To Pay</span>
                  <span>{formatPrice(totals.amountToPay)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {walletBalance > 0 && (
          <Card className="mb-6 shadow-sm border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-5 w-5 text-green-600" />
                Use Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3 p-3 border rounded-xl bg-gray-50 border-gray-200 hover:border-green-300 transition-colors">
                <input
                  type="checkbox"
                  id="use-wallet"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="use-wallet" className="cursor-pointer flex-1">
                  <div className="font-semibold text-sm">
                    Available Balance: {formatPrice(walletBalance)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {walletBalance >= totals.grandTotal
                      ? 'Fully covers this order'
                      : `Save ${formatPrice(walletBalance)} instantly`}
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {!appliedCoupon ? (
          <Card className="mb-6 shadow-sm border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-5 w-5 text-orange-500" />
                Have a Coupon?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code (e.g. WELCOME50)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
                <Button onClick={applyCoupon} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-full">
                <Tag className="h-4 w-4 text-green-700" />
              </div>
              <div>
                <div className="font-bold text-sm text-green-800">'{appliedCoupon.code}' Applied</div>
                <div className="text-xs text-green-600">You saved {formatPrice(totals.discountAmount)}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeCoupon} className="text-green-700 hover:text-green-900 hover:bg-green-100">
              Remove
            </Button>
          </div>
        )}

        <Card className="mb-6 shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-blue-500" />
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-phone" className="text-xs">Phone *</Label>
                  <Input
                    id="guest-phone"
                    type="tel"
                    placeholder="9876543210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-name" className="text-xs">Name</Label>
                  <Input
                    id="guest-name"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs">Address *</Label>
              <Textarea
                id="address"
                placeholder="House No, Street, Landmark..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                rows={2}
                className="resize-none"
              />
            </div>
            {gpsCoordinates && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <MapPin className="h-3 w-3" />
                GPS Location Captured
              </div>
            )}
            <VoiceRecorder onRecordingComplete={setVoiceNoteUrl} />
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="space-y-3">
              <div className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'PREPAID_UPI' ? 'border-green-500 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <RadioGroupItem value="PREPAID_UPI" id="prepaid" />
                <Label htmlFor="prepaid" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Pay Now (UPI)</div>
                    <div className="text-xs text-gray-500">Fastest checkout</div>
                  </div>
                </Label>
              </div>
              
              <div className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'COD_CASH' ? 'border-orange-500 bg-orange-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <RadioGroupItem value="COD_CASH" id="cod-cash" />
                <Label htmlFor="cod-cash" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Cash on Delivery</div>
                    <div className="text-xs text-gray-500">Pay cash to rider</div>
                  </div>
                </Label>
              </div>

              <div className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'COD_UPI_SCAN' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <RadioGroupItem value="COD_UPI_SCAN" id="cod-upi" />
                <Label htmlFor="cod-upi" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <QrCode className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Scan & Pay on Delivery</div>
                    <div className="text-xs text-gray-500">Pay via QR at door</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-50">
          <div className="container mx-auto max-w-2xl">
            <Button
              onClick={placeOrder}
              disabled={submitting || !deliveryAddress.trim()}
              className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700 shadow-orange-200 shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <div className="flex items-center justify-between w-full px-2">
                  <span className="text-orange-100 font-medium">
                    {totals.amountToPay === 0 ? 'FREE' : formatPrice(totals.amountToPay)}
                  </span>
                  <span>Place Order</span>
                </div>
              )}
            </Button>
          </div>
        </div>
        <div className="h-16"></div> {/* Spacer for fixed bottom button */}
      </div>
    </div>
  );
}