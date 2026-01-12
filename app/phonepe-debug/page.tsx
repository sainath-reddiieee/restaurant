'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function PhonePeDebugPage() {
  const [amount, setAmount] = useState('100');
  const [mobileNumber, setMobileNumber] = useState('9999999999');
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  const handleDebug = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDebugData(null);

    try {
      const response = await fetch('/api/phonepe/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          mobileNumber,
        }),
      });

      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      setDebugData({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">PhonePe Debug Tool</h1>
        <p className="text-gray-600 mt-2">
          Test PhonePe integration and see detailed request/response information
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test PhonePe Payment</CardTitle>
          <CardDescription>
            This will make a test API call to PhonePe and show all details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDebug} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="Enter mobile number"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test PhonePe API'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {debugData && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Results</CardTitle>
            <CardDescription>
              {debugData.success ? (
                <span className="text-green-600">API call completed - see details below</span>
              ) : (
                <span className="text-red-600">API call failed - see error below</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {debugData.debug && (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">Environment Configuration</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(debugData.debug.environment, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Request Details</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(debugData.debug.request, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Payment Request Payload</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(debugData.debug.paymentRequest, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Base64 Payload</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm break-all">
                      {debugData.debug.payload.base64}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Checksum Details</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(debugData.debug.checksum, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">API Request</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(debugData.debug.api, null, 2)}
                    </pre>
                  </div>
                </>
              )}

              {debugData.response && (
                <div>
                  <h3 className="font-semibold mb-2">
                    PhonePe API Response
                    {debugData.response.status && (
                      <span className={`ml-2 text-sm ${
                        debugData.response.status === 200 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        (Status: {debugData.response.status})
                      </span>
                    )}
                  </h3>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(debugData.response, null, 2)}
                  </pre>
                </div>
              )}

              {debugData.error && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">Error</h3>
                  <pre className="bg-red-50 p-4 rounded-lg overflow-x-auto text-sm text-red-600">
                    {debugData.error}
                  </pre>
                  {debugData.stack && (
                    <pre className="bg-red-50 p-4 rounded-lg overflow-x-auto text-xs text-red-600 mt-2">
                      {debugData.stack}
                    </pre>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How to Interpret Results</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li><strong>Status 200:</strong> Request format is correct</li>
                  <li><strong>Status 400:</strong> Invalid request format or parameters</li>
                  <li><strong>Status 401/403:</strong> Authentication failed (wrong credentials)</li>
                  <li><strong>Status 500:</strong> PhonePe server error</li>
                  <li><strong>success: true:</strong> Payment page URL should be in response</li>
                  <li><strong>success: false:</strong> Check the error message and code</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>PhonePe Sandbox Credentials:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Merchant ID: PGTESTPAYUAT</li>
              <li>Salt Key: 099eb0cd-02cf-4e2a-8aca-3e6c6aff0399</li>
              <li>Salt Index: 1</li>
              <li>Host URL: https://api-preprod.phonepe.com/apis/pg-sandbox</li>
            </ul>
            <p className="mt-4"><strong>Common Error Codes:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><code>BAD_REQUEST</code> - Invalid request format</li>
              <li><code>AUTHORIZATION_FAILED</code> - Wrong merchant credentials</li>
              <li><code>KEY_NOT_FOUND</code> - Merchant ID or salt key mismatch</li>
              <li><code>INVALID_CHECKSUM</code> - Checksum calculation error</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
