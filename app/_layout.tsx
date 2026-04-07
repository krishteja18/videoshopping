// import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, useFonts } from '@expo-google-fonts/nunito';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { Stack } from 'expo-router';
// import * as SplashScreen from 'expo-splash-screen';
// import { StatusBar } from 'expo-status-bar';
// import { useEffect, useState } from 'react';
// import 'react-native-reanimated';

// import CustomSplashScreen from '@/components/SplashScreenModern';
// import { useColorScheme } from '@/hooks/useColorScheme';
// import { supabase } from '@/lib/supabase';
// import { useRouter } from 'expo-router';

// // Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

// GoogleSignin.configure({
//   webClientId: '679113462565-t3tdajb4ekoqn2jlkegnvcbvuo41m01f.apps.googleusercontent.com',
//   offlineAccess: true,
//   scopes: ['profile','email'],
// });

// export default function RootLayout() {
//   const colorScheme = useColorScheme();
//   const [appIsReady, setAppIsReady] = useState(false);
//   const [showCustomSplash, setShowCustomSplash] = useState(true);
//   const [loaded] = useFonts({
//     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
//     // Nunito font variants
//     'Nunito-Regular': Nunito_400Regular,
//     'Nunito-Medium': Nunito_500Medium,
//     'Nunito-SemiBold': Nunito_600SemiBold,
//     'Nunito-Bold': Nunito_700Bold,
//   });
//   const router = useRouter();

//   useEffect(() => {
//     async function prepare() {
//       try {
//         if (loaded) {
//           await SplashScreen.hideAsync();
//           setAppIsReady(true);
//         }
//       } catch (e) {
//         console.warn(e);
//       }
//     }

//     prepare();
//   }, [loaded]);
  

//   useEffect(() => {
//     const { data: { subscription } } = supabase.auth.onAuthStateChange(
//       async (event, session) => {
//         if (event === 'SIGNED_IN' && session) {
//           console.log('User signed in:', session.user);
//           router.replace('/(tabs)');
//         } else if (event === 'SIGNED_OUT') {
//           router.replace('/welcome');
//         }
//       }
//     );

//     return () => {
//       subscription?.unsubscribe();
//     };
//   }, []);

//   const onCustomSplashFinish = () => {
//     console.log('🚀 Splash finished, showing welcome screen!');
//     setShowCustomSplash(false);
//   };

//   if (!appIsReady || showCustomSplash) {
//     return <CustomSplashScreen onAnimationFinish={onCustomSplashFinish} />;
//   }

//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <Stack initialRouteName="welcome">
//         <Stack.Screen name="welcome" options={{ headerShown: false }} />
//         <Stack.Screen name="auth" options={{ headerShown: false }} />
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//         <Stack.Screen name="+not-found" />
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }



import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, useFonts } from '@expo-google-fonts/nunito';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import CustomSplashScreen from '@/components/SplashScreenModern';
import AlertBanner from '@/components/ui/AlertBanner';
import IncomingCallModal from '@/components/ui/IncomingCallModal';
import { AlertProvider } from '@/context/AlertContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from './providers/AuthProvider';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

GoogleSignin.configure({
  webClientId: '679113462565-t3tdajb4ekoqn2jlkegnvcbvuo41m01f.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

// Main Layout Component
function Layout() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();
  const [customSplashFinished, setCustomSplashFinished] = useState(false);
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-Medium': Nunito_500Medium,
    'Nunito-SemiBold': Nunito_600SemiBold,
    'Nunito-Bold': Nunito_700Bold,
  });

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [showIncomingModal, setShowIncomingModal] = useState(false);

  // Handle navigation based on session changes
  useEffect(() => {
    if (!isLoading && customSplashFinished) {
      console.log('🔄 Navigation effect triggered:', { hasSession: !!session });
      if (session) {
        console.log('🔄 Navigating to (tabs)');
        router.replace('/(tabs)');
      } else {
        console.log('🔄 Navigating to welcome');
        router.replace('/welcome');
      }
    }
  }, [session, isLoading, customSplashFinished]);

  // Listen for incoming calls
  useEffect(() => {
    if (session?.user?.id) {
      const channel = supabase
        .channel('incoming_calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_calls',
            filter: `seller_id=eq.${session.user.id}`
          },
          async (payload) => {
            console.log('📞 Incoming call received:', payload.new);
            
            // Fetch buyer details for the modal
            const { data: callData } = await supabase
              .from('video_calls')
              .select('*, buyer:profiles!video_calls_buyer_id_fkey(full_name, avatar_url)')
              .eq('id', payload.new.id)
              .single();
              
            if (callData) {
              setIncomingCall(callData);
              setShowIncomingModal(true);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const onCustomSplashFinish = () => {
    console.log('🎬 Custom splash finished');
    setCustomSplashFinished(true);
  };

  console.log('🏠 Layout render state:', {
    loaded,
    isLoading,
    customSplashFinished,
    hasSession: !!session,
    userEmail: session?.user?.email
  });

  // Show splash until fonts are loaded, auth is checked, and custom splash is done
  if (!loaded || isLoading || !customSplashFinished) {
    console.log('🎬 Showing splash screen');
    return <CustomSplashScreen onAnimationFinish={onCustomSplashFinish} />;
  }

  // Always render the same Stack structure, let the navigation effect handle routing
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product" options={{ headerShown: false }} />
        <Stack.Screen name="live-call" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <AlertBanner />
      <IncomingCallModal 
        visible={showIncomingModal} 
        callData={incomingCall} 
        onClose={() => setShowIncomingModal(false)} 
      />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Root Layout Component
export default function RootLayout() {
  console.log('🏠 RootLayout render');
  return (
    <AuthProvider>
      <AlertProvider>
        <Layout />
      </AlertProvider>
    </AuthProvider>
  );
}
