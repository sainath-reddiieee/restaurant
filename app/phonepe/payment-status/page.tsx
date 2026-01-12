'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkPhonePePaymentStatus } from '@/lib/phonepe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'pending'>('checking');
  const [message, setMessage] = useState('Verifying your payment...');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const type = searchParams.get('type'); // ORDER or RECHARGE
  const txnId = searchParams.get('txnId');

  useEffect(() => {
    if (!txnId) {
      setStatus('failed');
      setMessage('Invalid transaction');
      return;
    }

    verifyPayment();
  }, [txnId]);

  const verifyPayment = async () => {
    try {
      const response = await fetch(`/api/phonepe/verify?txnId=${txnId}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Payment successful!');
        setTransactionId(data.transactionId);

        // Redirect after 2 seconds
        setTimeout(() => {
          if (type === 'ORDER') {
            // Extract order ID from transaction ID
            const [, orderId] = txnId!.split('-');
            router.push(`/orders/${orderId}`);
          } else if (type === 'RECHARGE') {
            router.push('/partner/wallet');
          }
        }, 2000);
      } else if (data.pending) {
        setStatus('pending');
        setMessage('Payment is being processed...');
        // Retry after 3 seconds
        setTimeout(verifyPayment, 3000);
      } else {
        setStatus('failed');
        setMessage(data.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('failed');
      setMessage('Failed to verify payment status');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
      case 'pending':
        return <Loader2 className="h-16 w-16 animate-spin text-orange-500" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'failed':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'failed':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-orange-500 bg-orange-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className={`max-w-md w-full ${getStatusColor()} border-2`}>
        <CardHeader>
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-center text-2xl">
            {status === 'checking' && 'Verifying Payment'}
            {status === 'pending' && 'Payment Processing'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {transactionId && (
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Transaction ID:</p>
              <p className="font-mono text-sm font-semibold break-all">{transactionId}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center text-sm text-gray-600">
              Redirecting you shortly...
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-2">
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={() => router.back()}
              >
                Go Back
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/')}
              >
                Go to Home
              </Button>
            </div>
          )}

          {status === 'pending' && (
            <div className="text-center text-sm text-gray-600">
              Please wait while we confirm your payment...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
