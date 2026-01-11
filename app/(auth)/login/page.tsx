'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { signInWithEmail, resetPassword } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('🔐 Starting login process...');
    console.log('📧 Email:', email);

    try {
      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        console.error('❌ Login error:', error);
        toast({
          title: 'Login Failed',
          description: error.message || 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!data.user || !data.session) {
        console.error('❌ Login failed: No user data returned');
        toast({
          title: 'Login Failed',
          description: 'Unable to sign in. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('✅ Login successful!');
      console.log('👤 User ID:', data.user.id);
      console.log('🎫 Session token length:', data.session.access_token?.length);
      console.log('⏰ Session expires at:', new Date(data.session.expires_at! * 1000).toLocaleString());

      toast({
        title: 'Success',
        description: 'Signed in successfully!',
      });

      console.log('⏳ Waiting for profile to load...');

      const userId = data.user.id;

      // Wait for profile to be created/loaded
      let attempts = 0;
      let profile = null;
      while (attempts < 10) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (profileData) {
          profile = profileData;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
        attempts++;
      }

      console.log('👤 Profile loaded:', profile);

      // Determine redirect based on role
      let redirectPath = '/';
      if (profile) {
        switch (profile.role) {
          case 'SUPER_ADMIN':
            redirectPath = '/admin';
            break;
          case 'RESTAURANT_OWNER':
            redirectPath = '/partner';
            break;
          case 'CUSTOMER':
            redirectPath = '/';
            break;
          default:
            redirectPath = '/';
        }
      }

      console.log('🚀 Redirecting to:', redirectPath);
      router.push(redirectPath);
    } catch (error) {
      console.error('❌ Auth error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Password reset link sent to your email!',
        });
        setShowResetPassword(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reset link.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your Anantapur account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showResetPassword ? (
            <>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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
                  />
                </div>

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <Button
                type="button"
                variant="link"
                className="w-full text-sm text-orange-600 hover:text-orange-700"
                onClick={() => setShowResetPassword(true)}
                disabled={loading}
              >
                Forgot password?
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="button"
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowResetPassword(false)}
                disabled={loading}
              >
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
