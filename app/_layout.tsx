import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, useFonts } from '@expo-google-fonts/nunito';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import CustomSplashScreen from '@/components/SplashScreenModern';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // Nunito font variants
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-Medium': Nunito_500Medium,
    'Nunito-SemiBold': Nunito_600SemiBold,
    'Nunito-Bold': Nunito_700Bold,
  });
  const router = useRouter();

  useEffect(() => {
    async function prepare() {
      try {
        if (loaded) {
          await SplashScreen.hideAsync();
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();
  }, [loaded]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in:', session.user);
          router.replace('/(tabs)');
        } else if (event === 'SIGNED_OUT') {
          router.replace('/welcome');
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const onCustomSplashFinish = () => {
    console.log('🚀 Splash finished, showing welcome screen!');
    setShowCustomSplash(false);
  };

  if (!appIsReady || showCustomSplash) {
    return <CustomSplashScreen onAnimationFinish={onCustomSplashFinish} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="welcome">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
