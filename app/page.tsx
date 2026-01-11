'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Store, ChefHat } from 'lucide-react';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      switch (profile.role) {
        case 'SUPER_ADMIN':
          router.push('/admin');
          break;
        case 'RESTAURANT':
          router.push('/dashboard');
          break;
        case 'CUSTOMER':
          router.push('/menu');
          break;
        default:
          break;
      }
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl mb-4 shadow-xl">
              <ChefHat className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent tracking-tight">
              GO515
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto font-medium">
              Digital Storefront & Logistics Platform for Local Restaurants
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-100 hover:shadow-xl hover:border-red-200 transition-all transform hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl mb-4 shadow-md">
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Order Food</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Browse local restaurants and order delicious food with voice commands
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-100 hover:shadow-xl hover:border-amber-200 transition-all transform hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl mb-4 shadow-md">
                <Store className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Loot Mode</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Flash sales on excess inventory at discounted prices
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-100 hover:shadow-xl hover:border-green-200 transition-all transform hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4 shadow-md">
                <ChefHat className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Mystery Boxes</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Surprise meals at great prices, perfect for adventurous eaters
              </p>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-10 py-7 text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
              onClick={() => router.push('/login')}
            >
              Get Started
            </Button>
            <p className="text-sm text-gray-600 font-medium">
              For restaurant owners and super admins
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
