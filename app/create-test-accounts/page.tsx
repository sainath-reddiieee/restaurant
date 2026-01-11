'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Shield, Store, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateTestAccountsPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const createTestAccount = async (role: 'SUPER_ADMIN' | 'RESTAURANT' | 'CUSTOMER') => {
    setLoading(true);
    try {
      const { signUpWithEmail } = await import('@/lib/supabase/auth');
      const { supabase } = await import('@/lib/supabase/client');

      const accounts = {
        SUPER_ADMIN: {
          email: 'admin@test.com',
          password: 'Admin123456',
          fullName: 'Test Admin',
          phone: '1111111111',
        },
        RESTAURANT: {
          email: 'restaurant@test.com',
          password: 'Restaurant123456',
          fullName: 'Test Restaurant Owner',
          phone: '2222222222',
        },
        CUSTOMER: {
          email: 'customer@test.com',
          password: 'Customer123456',
          fullName: 'Test Customer',
          phone: '3333333333',
        },
      };

      const account = accounts[role];

      const { data, error } = await signUpWithEmail(
        account.email,
        account.password,
        account.phone,
        account.fullName
      );

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'Account Already Exists',
            description: `The ${role} account already exists. Try logging in instead.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        if (role !== 'CUSTOMER') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', data.user.id);

          if (updateError) {
            console.error('Error updating role:', updateError);
            toast({
              title: 'Partial Success',
              description: 'Account created but role update failed. Update role manually in database.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }

        toast({
          title: 'Success!',
          description: `${role} test account created successfully!`,
        });
      }
    } catch (err) {
      console.error('Error creating test account:', err);
      toast({
        title: 'Error',
        description: 'Failed to create test account. Check console for details.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Test Accounts</h1>
          <p className="text-gray-600">
            Quickly create test accounts for different roles to explore all features
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Admin Account</CardTitle>
              <CardDescription>Full system access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-mono text-xs">admin@test.com</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Password</Label>
                  <p className="font-mono text-xs">Admin123456</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Access</Label>
                  <p className="text-xs">/admin, /dashboard</p>
                </div>
              </div>
              <Button
                className="w-full bg-purple-500 hover:bg-purple-600"
                onClick={() => createTestAccount('SUPER_ADMIN')}
                disabled={loading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Admin
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Restaurant Account</CardTitle>
              <CardDescription>Restaurant owner access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-mono text-xs">restaurant@test.com</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Password</Label>
                  <p className="font-mono text-xs">Restaurant123456</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Access</Label>
                  <p className="text-xs">/dashboard (menu, orders)</p>
                </div>
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={() => createTestAccount('RESTAURANT')}
                disabled={loading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Restaurant
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Customer Account</CardTitle>
              <CardDescription>Customer access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-mono text-xs">customer@test.com</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Password</Label>
                  <p className="font-mono text-xs">Customer123456</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Access</Label>
                  <p className="text-xs">Browse, order food</p>
                </div>
              </div>
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={() => createTestAccount('CUSTOMER')}
                disabled={loading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Customer
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Your Existing Account</CardTitle>
            <CardDescription className="text-orange-700">
              You already have an admin account in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-orange-900">Email</Label>
                <p className="font-mono text-sm text-orange-700">psainath123@gmail.com</p>
              </div>
              <div>
                <Label className="text-sm text-orange-900">Role</Label>
                <p className="text-sm text-orange-700">SUPER_ADMIN (Full Access)</p>
              </div>
              <div>
                <Label className="text-sm text-orange-900">What to do?</Label>
                <p className="text-sm text-orange-700 mb-3">
                  Use the &quot;Forgot password?&quot; feature on the login page if you don&apos;t remember your password.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="bg-white"
                  onClick={() => router.push('/login')}
                >
                  Go to Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">After Creating Accounts:</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Admin accounts can login at <code className="bg-gray-100 px-1 rounded">/login</code> or <code className="bg-gray-100 px-1 rounded">/partner</code></li>
                  <li>Restaurant accounts should login at <code className="bg-gray-100 px-1 rounded">/partner</code></li>
                  <li>Customer accounts can browse without login, or login at checkout</li>
                  <li>Use the credentials shown above to login</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Need to Reset?</h4>
                <p className="text-gray-600">
                  If accounts already exist and you need to delete them, go to your Supabase Dashboard → Authentication → Users and delete them manually.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
