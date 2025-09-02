// Create: app/auth/callback.tsx
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

export default function AuthCallback() {
  const [isProcessing, setIsProcessing] = useState(true);
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          Alert.alert('Authentication Error', error.message);
          router.replace('/welcome');
          return;
        }

        if (data.session) {
          console.log('✅ Authentication successful!', data.session.user);
          // The auth state listener in _layout.tsx will handle the redirect
          router.replace('/(tabs)');
        } else {
          console.log('No session found, redirecting to welcome');
          router.replace('/welcome');
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        router.replace('/welcome');
      } finally {
        setIsProcessing(false);
      }
    };

    // Small delay to ensure the URL params are processed
    const timer = setTimeout(handleAuthCallback, 1000);
    
    return () => clearTimeout(timer);
  }, [params]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#F5F5F5' 
    }}>
      <ActivityIndicator size="large" color="#F9CF35" />
      <Text style={{ 
        marginTop: 16, 
        fontSize: 16,
        fontFamily: 'Nunito-Medium',
        color: '#333333'
      }}>
        {isProcessing ? 'Completing sign in...' : 'Redirecting...'}
      </Text>
    </View>
  );
}