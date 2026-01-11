'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { signInWithEmail } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import { Store, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PartnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          switch (profile.role) {
            case 'SUPER_ADMIN':
              window.location.href = '/admin';
              return;
            case 'RESTAURANT':
              window.location.href = '/dashboard';
              return;
            default:
              window.location.href = '/';
          }
        }
      }
    };
    checkSession();
  }, []);

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
        toast({
          title: 'Success',
          description: 'Signed in successfully!',
        });

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        await new Promise(resolve => setTimeout(resolve, 1500));

        if (profile) {
          switch (profile.role) {
            case 'SUPER_ADMIN':
              window.location.href = '/admin';
              break;
            case 'RESTAURANT':
              window.location.href = '/dashboard';
              break;
            default:
              window.location.href = '/';
          }
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
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In to Dashboard
                  </>
                )}
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
