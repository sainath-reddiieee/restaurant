'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function MockPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<'success' | 'failed' | 'pending' | null>(null);

  const merchantTransactionId = searchParams.get('merchantTransactionId') || '';
  const amount = parseFloat(searchParams.get('amount') || '0');
  const redirectUrl = searchParams.get('redirectUrl') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '';
  const merchantUserId = searchParams.get('merchantUserId') || '';
  const mobileNumber = searchParams.get('mobileNumber') || '';

  const handlePaymentAction = async (status: 'success' | 'failed' | 'pending') => {
    console.log('[Mock Payment V2] User clicked:', status);
    console.log('[Mock Payment V2] Transaction ID:', merchantTransactionId);
    console.log('[Mock Payment V2] Amount:', amount);

    setProcessing(true);
    setResult(status);

    try {
      console.log('[Mock Payment V2] Calling callback endpoint...');
      const callbackUrl = '/api/phonepe/mock/callback';
      console.log('[Mock Payment V2] Callback URL:', callbackUrl);

      const requestBody = {
        merchantTransactionId,
        status,
        amount,
        code: status === 'success' ? 'PAYMENT_SUCCESS' : 'PAYMENT_ERROR',
        message: status === 'success' ? 'Payment successful' : 'Payment failed'
      };
      console.log('[Mock Payment V2] Request body:', requestBody);

      // Call the mock callback to update database
      const callbackResponse = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Mock Payment V2] Callback response status:', callbackResponse.status);
      console.log('[Mock Payment V2] Callback response ok:', callbackResponse.ok);

      const callbackData = await callbackResponse.json();
      console.log('[Mock Payment V2] Callback response data:', callbackData);

      // Wait a bit to show the result
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Redirect based on status
      if (redirectUrl) {
        const redirectUrlObj = new URL(redirectUrl, window.location.origin);
        redirectUrlObj.searchParams.set('transactionId', merchantTransactionId);
        redirectUrlObj.searchParams.set('status', status);
        router.push(redirectUrlObj.pathname + redirectUrlObj.search);
      } else {
        // Default redirect
        if (merchantTransactionId.startsWith('order_')) {
          router.push(`/orders/${merchantTransactionId}?status=${status}`);
        } else if (merchantTransactionId.startsWith('wallet_')) {
          router.push(`/profile?wallet_status=${status}`);
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('[Mock Payment V2] ==================== ERROR ====================');
      console.error('[Mock Payment V2] Error type:', typeof error);
      console.error('[Mock Payment V2] Error:', error);

      if (error instanceof Error) {
        console.error('[Mock Payment V2] Error message:', error.message);
        console.error('[Mock Payment V2] Error stack:', error.stack);
        console.error('[Mock Payment V2] Error name:', error.name);
      }

      if (error && typeof error === 'object') {
        console.error('[Mock Payment V2] Error keys:', Object.keys(error));
        try {
          console.error('[Mock Payment V2] Error JSON:', JSON.stringify(error, null, 2));
        } catch (e) {
          console.error('[Mock Payment V2] Could not stringify error');
        }
      }

      console.error('[Mock Payment V2] =========================================================');

      alert(`Error processing mock payment:\n${error instanceof Error ? error.message : String(error)}\n\nCheck browser console for details.`);
      setProcessing(false);
      setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Mock Payment Gateway</CardTitle>
          <CardDescription>
            This is a simulated PhonePe payment for testing
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {result ? (
            <div className="text-center py-8">
              {result === 'success' && (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-700 mb-2">Payment Successful!</h3>
                  <p className="text-gray-600">Redirecting...</p>
                </>
              )}
              {result === 'failed' && (
                <>
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-red-700 mb-2">Payment Failed</h3>
                  <p className="text-gray-600">Redirecting...</p>
                </>
              )}
              {result === 'pending' && (
                <>
                  <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-yellow-700 mb-2">Payment Pending</h3>
                  <p className="text-gray-600">Redirecting...</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount</span>
                  <span className="text-2xl font-bold text-gray-900">₹{amount.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transaction ID</span>
                    <span className="font-mono text-xs text-gray-900">{merchantTransactionId}</span>
                  </div>

                  {merchantUserId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">User ID</span>
                      <span className="font-mono text-xs text-gray-900">{merchantUserId}</span>
                    </div>
                  )}

                  {mobileNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Mobile</span>
                      <span className="font-mono text-xs text-gray-900">{mobileNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Choose a payment outcome to simulate:
                </p>

                <Button
                  onClick={() => handlePaymentAction('success')}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Simulate Success
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handlePaymentAction('failed')}
                  disabled={processing}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Simulate Failure
                </Button>

                <Button
                  onClick={() => handlePaymentAction('pending')}
                  disabled={processing}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Simulate Pending
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> This is a mock payment gateway for testing purposes only.
                  No real money will be processed.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
