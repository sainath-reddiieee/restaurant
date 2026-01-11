'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { signInWithEmail } from '@/lib/supabase/auth';
import { Store, ArrowLeft, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PartnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message || 'Invalid credentials. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        const { supabase: supabaseClient } = await import('@/lib/supabase/client');
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        if (profile?.role === 'CUSTOMER') {
          toast({
            title: 'Access Denied',
            description: 'This portal is for restaurant partners and admins only.',
            variant: 'destructive',
          });
          await supabaseClient.auth.signOut();
          setLoading(false);
          return;
        }

        toast({
          title: 'Success',
          description: 'Signed in successfully! Redirecting...',
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        if (profile?.role === 'SUPER_ADMIN') {
          window.location.href = '/admin';
        } else if (profile?.role === 'RESTAURANT') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/';
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mx-auto mb-4">
              <Store className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Partner Portal</CardTitle>
            <CardDescription>
              Sign in to manage your restaurant or admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="partner@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={loading}
              >
                <Lock className="mr-2 h-4 w-4" />
                Sign In to Dashboard
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 font-medium mb-1">
                For Restaurant Partners & Admins Only
              </p>
              <p className="text-xs text-blue-700">
                Customers can browse and order without logging in. Authentication only required at checkout.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
