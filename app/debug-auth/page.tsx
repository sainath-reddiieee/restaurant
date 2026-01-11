'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugAuthPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cookies, setCookies] = useState<string>('');

  const checkAuth = async () => {
    setError(null);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      setError(`Session Error: ${sessionError.message}`);
      return;
    }

    setSessionInfo({
      hasSession: !!session,
      userId: session?.user?.id || 'No user',
      email: session?.user?.email || 'No email',
      expiresAt: session?.expires_at || 'No expiry',
      accessToken: session?.access_token ? `${session.access_token.substring(0, 20)}...` : 'No token',
    });

    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        setError(`Profile Error: ${JSON.stringify(profileError, null, 2)}`);
        setProfileInfo({ error: profileError });
      } else {
        setProfileInfo(profile);
      }
    }

    if (typeof document !== 'undefined') {
      setCookies(document.cookie);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Auth Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkAuth}>Refresh Data</Button>

            <div>
              <h3 className="font-bold mb-2">Session Info:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(sessionInfo, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-bold mb-2">Profile Info:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(profileInfo, null, 2)}
              </pre>
            </div>

            {error && (
              <div>
                <h3 className="font-bold mb-2 text-red-600">Error:</h3>
                <pre className="bg-red-50 p-4 rounded overflow-auto text-xs text-red-600">
                  {error}
                </pre>
              </div>
            )}

            <div>
              <h3 className="font-bold mb-2">Cookies:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs break-all">
                {cookies || 'No cookies found'}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
