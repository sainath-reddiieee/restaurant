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
import { Loader2, MapPin, Tag, CreditCard, Wallet, QrCode, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, generateUPIDeepLink } from '@/lib/format';
import { calculateGST, type GSTBreakdown } from '@/lib/gst-calculator';
import Link from 'next/link';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { items: cartItems, cartTotal, clearCart, isInitialized: cartInitialized } = useCart();
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
  }, [slug, cartItems.length, authLoading, profile, cartInitialized]);

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
        // Initiate PhonePe payment
        try {
          const phoneNumber = profile?.phone || guestPhone;
          const transactionId = `ORDER-${order.id}-${Date.now()}`;

          // Update order with payment transaction ID
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
            // Redirect to PhonePe payment page
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/r/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>
          <h1 className="text-2xl font-bold mt-2">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
          <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cartItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>{formatPrice(item.selling_price * item.quantity)}</span>
              </div>
            ))}

            <Separator className="my-3" />

            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal (before GST)</span>
              <span>{formatPrice(totals.subtotalBeforeGST)}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>GST on Food (5%)</span>
              <span>{formatPrice(totals.foodGSTAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>Food Total</span>
              <span>{formatPrice(totals.subtotalAfterGST)}</span>
            </div>

            {totals.deliveryFeeAfterGST > 0 && (
              <>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee (before GST)</span>
                  <span>{formatPrice(totals.deliveryFeeBeforeGST)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST on Delivery (18%)</span>
                  <span>{formatPrice(totals.deliveryGSTAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{formatPrice(totals.deliveryFeeAfterGST)}</span>
                </div>
              </>
            )}

            {totals.deliveryFeeAfterGST === 0 && (
              <div className="flex justify-between text-green-600">
                <span>Delivery Fee</span>
                <span>FREE</span>
              </div>
            )}

            {appliedCoupon && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({appliedCoupon.code})</span>
                <span>-{formatPrice(totals.discountAmount)}</span>
              </div>
            )}

            <Separator className="my-3" />

            <div className="flex justify-between text-sm font-medium text-gray-700 bg-gray-50 -mx-6 px-6 py-2">
              <span>Total GST</span>
              <span>{formatPrice(totals.totalGSTAmount)}</span>
            </div>

            <div className="flex justify-between text-xs text-gray-500 -mx-6 px-6">
              <span>CGST: {formatPrice(totals.cgstAmount)}</span>
              <span>SGST: {formatPrice(totals.sgstAmount)}</span>
            </div>

            <Separator className="my-3" />

            <div className="flex justify-between font-bold text-lg">
              <span>Grand Total</span>
              <span>{formatPrice(totals.grandTotal)}</span>
            </div>

            {useWallet && totals.walletDeduction > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Wallet Used</span>
                  <span>-{formatPrice(totals.walletDeduction)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg text-orange-600">
                  <span>Amount to Pay</span>
                  <span>{formatPrice(totals.amountToPay)}</span>
                </div>
              </>
            )}

            {restaurant?.gst_enabled !== false && (
              <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg mt-3">
                <p className="font-medium text-blue-900 mb-1">GST Breakdown:</p>
                <p>GST is added as per Indian government regulations.</p>
                <p>Food: 5% (CGST 2.5% + SGST 2.5%)</p>
                <p>Delivery: 18% (CGST 9% + SGST 9%)</p>
                {restaurant?.gst_number && (
                  <p className="mt-1">Restaurant GSTIN: {restaurant.gst_number}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

{walletBalance > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Use Wallet Balance
              </CardTitle>
              <CardDescription>
                Available balance: {formatPrice(walletBalance)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-green-50 border-green-200">
                <input
                  type="checkbox"
                  id="use-wallet"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="use-wallet" className="cursor-pointer flex-1">
                  <div className="font-semibold">
                    Use Wallet Balance ({formatPrice(Math.min(walletBalance, totals.grandTotal))})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {walletBalance >= totals.grandTotal
                      ? 'Your wallet will cover the full amount!'
                      : `Reduce your payment by ${formatPrice(walletBalance)}`}
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {!appliedCoupon ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Apply Coupon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <Button onClick={applyCoupon} variant="outline">
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">{appliedCoupon.code} applied!</span>
                  <span className="text-green-600">Saved {formatPrice(totals.discountAmount)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={removeCoupon}>
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="guest-phone">Phone Number *</Label>
                  <Input
                    id="guest-phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Required for delivery updates</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-name">Name (Optional)</Label>
                  <Input
                    id="guest-name"
                    placeholder="Enter your name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="address">Delivery Address *</Label>
              <Textarea
                id="address"
                placeholder="Enter your full address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                rows={3}
              />
            </div>
            {gpsCoordinates && (
              <p className="text-xs text-muted-foreground">
                Location captured: {gpsCoordinates}
              </p>
            )}
            <VoiceRecorder onRecordingComplete={setVoiceNoteUrl} />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Choose how you want to pay</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="PREPAID_UPI" id="prepaid" />
                <Label htmlFor="prepaid" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-semibold">Pay Now (UPI)</div>
                    <div className="text-xs text-muted-foreground">Instant payment via UPI</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="COD_CASH" id="cod-cash" />
                <Label htmlFor="cod-cash" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Wallet className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-semibold">Cash on Delivery</div>
                    <div className="text-xs text-muted-foreground">Keep exact change ready</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="COD_UPI_SCAN" id="cod-upi" />
                <Label htmlFor="cod-upi" className="flex items-center gap-2 cursor-pointer flex-1">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">UPI on Delivery</div>
                    <div className="text-xs text-muted-foreground">Scan rider's QR at door</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Button
          onClick={placeOrder}
          disabled={submitting || !deliveryAddress.trim()}
          className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              Place Order • {totals.amountToPay === 0 ? 'FREE (Wallet)' : formatPrice(totals.amountToPay)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
