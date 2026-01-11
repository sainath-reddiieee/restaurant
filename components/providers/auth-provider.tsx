'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, accessToken?: string, retryCount = 0): Promise<void> => {
    console.log('🔍 Fetching profile for user:', userId, `(attempt ${retryCount + 1})`);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    console.log('📊 Query result:', { hasData: !!data, hasError: !!error });

    // Check for RLS errors specifically - these indicate session token not attached yet
    if (error) {
      console.error('❌ Error fetching profile:', error.message, 'Code:', error.code);

      // RLS policy violations or JWT errors mean token isn't attached yet - retry
      if ((error.message?.includes('RLS') ||
           error.message?.includes('policy') ||
           error.message?.includes('JWT') ||
           error.code === 'PGRST301' ||
           error.code === '42501') &&
          retryCount < 5) {
        const delay = Math.pow(2, retryCount) * 100; // 100ms, 200ms, 400ms, 800ms, 1600ms
        console.log(`🔄 Session token not ready, retrying in ${delay}ms... (attempt ${retryCount + 1}/5)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchProfile(userId, accessToken, retryCount + 1);
      }

      // Non-retryable error
      console.error('🚨 Non-retryable error or max retries reached');
      const { data: { session } } = await supabase.auth.getSession();
      console.error('Debug - Session exists:', !!session);
      console.error('Debug - Session user ID:', session?.user?.id);
      console.error('Debug - Querying for ID:', userId);
      return;
    }

    if (data) {
      console.log('✅ Profile loaded successfully:', {
        id: data.id,
        role: data.role,
        fullName: data.full_name,
        phone: data.phone
      });
      setProfile(data);
      return;
    }

    // Only create profile if there's NO error AND NO data (profile truly doesn't exist)
    console.log('⚠️ Profile not found, creating one...');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const phone = user.phone || user.user_metadata?.phone || user.email || '';
      const fullName = user.user_metadata?.full_name || '';

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          phone,
          full_name: fullName,
          role: 'CUSTOMER',
          wallet_balance: 0,
        })
        .select()
        .maybeSingle();

      if (newProfile) {
        console.log('✅ Profile created successfully');
        setProfile(newProfile);
      } else {
        console.error('❌ Error creating profile:', createError);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      await fetchProfile(user.id, session?.access_token);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider: Initializing...');
    let isSubscribed = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isSubscribed) return;

      console.log('📦 Initial session check:', !!session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('👤 User found in initial session:', session.user.id);
        fetchProfile(session.user.id, session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;

      console.log('🔔 Auth state changed:', event, 'Session exists:', !!session);

      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('👤 User authenticated:', session.user.id);
        console.log('🎫 Access token available:', !!session.access_token, 'Length:', session.access_token?.length);

        fetchProfile(session.user.id, session.access_token);
      } else {
        console.log('👋 User signed out or session expired');
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      console.log('🛑 AuthProvider: Cleaning up subscription');
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
