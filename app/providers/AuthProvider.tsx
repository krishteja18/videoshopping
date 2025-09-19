import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

// 1. Create the Auth Context
const AuthContext = createContext<{
  session: Session | null;
  isLoading: boolean;
}>({
  session: null,
  isLoading: true,
});

// 2. Create the AuthProvider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider: Setting up auth...');
    
    // Get initial session first
    const getInitialSession = async () => {
      try {
        console.log('🔐 AuthProvider: Calling supabase.auth.getSession()...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('🔐 AuthProvider: Raw response from getSession:', {
          session: session ? 'EXISTS' : 'NULL',
          error: error ? error.message : 'NO_ERROR',
          userEmail: session?.user?.email,
          accessToken: session?.access_token ? 'EXISTS' : 'NULL',
          expiresAt: session?.expires_at,
          tokenType: session?.token_type
        });
        
        if (error) {
          console.log('🔐 AuthProvider: Error getting initial session:', error.message);
        } else {
          console.log('🔐 AuthProvider: Initial session check:', session ? `User: ${session.user.email}` : 'No session');
          setSession(session);
        }
      } catch (error) {
        console.log('🔐 AuthProvider: Exception getting initial session:', error);
      } finally {
        setIsLoading(false);
        console.log('🔐 AuthProvider: Initial session check complete, isLoading set to false');
      }
    };

    // Start with getting the initial session
    getInitialSession();

    // Then listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 AuthProvider: Auth state changed:', {
        event,
        hasSession: !!session,
        userEmail: session?.user?.email,
        timestamp: new Date().toISOString()
      });
      setSession(session);
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔐 AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  console.log('🔐 AuthProvider render:', { 
    hasSession: !!session, 
    isLoading, 
    userEmail: session?.user?.email,
    timestamp: new Date().toISOString()
  });

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Create a custom hook to access the session
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}