'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Shield, Store, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateTestAccountsPage() {
  const router = useRouter();

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Information</h1>
          <p className="text-gray-600">
            Reference for existing accounts in the system
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
                  <p className="font-mono text-xs">psainath123@gmail.com</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Access</Label>
                  <p className="text-xs">/admin, /dashboard</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow opacity-50">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Restaurant Account</CardTitle>
              <CardDescription>Create via admin panel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Info</Label>
                  <p className="text-xs">Restaurant accounts must be created by admins through the admin panel</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow opacity-50">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Customer Account</CardTitle>
              <CardDescription>Auto-created at checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Info</Label>
                  <p className="text-xs">Customers browse as guests. Accounts are created automatically at checkout.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Admin Login</CardTitle>
            <CardDescription className="text-orange-700">
              Use your admin credentials to access the system
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
                <Label className="text-sm text-orange-900">Forgot Password?</Label>
                <p className="text-sm text-orange-700 mb-3">
                  Use the &quot;Forgot password?&quot; feature on the login page to reset your password.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
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
                <h4 className="font-semibold mb-2">Login Access:</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Admin accounts can login at <code className="bg-gray-100 px-1 rounded">/login</code> or <code className="bg-gray-100 px-1 rounded">/partner</code></li>
                  <li>Restaurant accounts should login at <code className="bg-gray-100 px-1 rounded">/partner</code></li>
                  <li>Customers browse without login - accounts auto-created at checkout</li>
                  <li>No public signup - all accounts are managed by admins</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Need Help?</h4>
                <p className="text-gray-600">
                  Contact the system administrator to create new restaurant or staff accounts. Customer accounts are created automatically during checkout.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
