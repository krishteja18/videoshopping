import { BrandColors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

// Google Icon using the actual Google logo image
const GoogleIcon = () => (
  <Image
    source={require('@/assets/images/google-logo.png')}
    style={styles.googleIcon}
    resizeMode="contain"
  />
);

// Facebook Icon
const FacebookIcon = () => (
  <View style={styles.facebookIcon}>
    <Text style={styles.facebookText}>f</Text>
  </View>
);

export default function WelcomeScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Check Apple Sign In availability
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }

    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);



// In welcome.tsx, update the handleGoogleSignIn function
// const handleGoogleSignIn = async () => {
//   setIsLoading(true);
//   try {
//     // Check if Google Play Services are available with better error handling
//     const playServicesAvailable = await GoogleSignin.hasPlayServices({
//       showPlayServicesUpdateDialog: true,
//     });
    
//     if (!playServicesAvailable) {
//       throw new Error('Google Play Services not available');
//     }
    
//     // Show native Google account chooser dialog (like Zomato)
//     const userInfo = await GoogleSignin.signIn();
//     const idToken = userInfo.data?.idToken;
    
//     if (!idToken) {
//       throw new Error('No idToken returned from Google');
//     }

//     console.log('✅ Native Google Sign-In successful, signing into Supabase...');

//     // Sign in to Supabase with the Google ID token
//     const { data, error } = await supabase.auth.signInWithIdToken({
//       provider: 'google',
//       token: idToken,
//     });

//     if (error) throw error;

//     console.log('✅ Supabase sign-in successful:', data.session?.user);
    
//     // Add this additional check right after login
//     const immediateCheck = await supabase.auth.getSession();
//     console.log('🔍 Immediate session check after login:', immediateCheck.data.session ? `EXISTS - ${immediateCheck.data.session.user.email}` : 'NULL');
    
//   } catch (error: any) {
//     console.error('Native Google sign in error:', error);
    
//     // More specific error messages
//     if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
//       Alert.alert(
//         'Google Play Services Required', 
//         'Please update Google Play Services from the Play Store to continue.'
//       );
//     } else {
//       Alert.alert('Google Sign-In failed', error.message || 'Unexpected error');
//     }
//   } finally {
//     setIsLoading(false);
//   }
// };

const handleGoogleSignIn = async () => {
  setIsLoading(true);
  try {
    // Check if Google Play Services are available with better error handling
    const playServicesAvailable = await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
    
    if (!playServicesAvailable) {
      throw new Error('Google Play Services not available');
    }
    
    // Show native Google account chooser dialog (like Zomato)
    const userInfo = await GoogleSignin.signIn();
    
    // Check if sign-in was cancelled
    if (!userInfo || !userInfo.data) {
      console.log('👤 User cancelled Google sign-in');
      return; // Exit silently without showing error
    }
    
    const idToken = userInfo.data?.idToken;
    
    if (!idToken) {
      throw new Error('No idToken returned from Google');
    }

    console.log('✅ Native Google Sign-In successful, signing into Supabase...');

    // Sign in to Supabase with the Google ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) throw error;

    console.log('✅ Supabase sign-in successful:', data.session?.user);
    
    // Add this additional check right after login
    const immediateCheck = await supabase.auth.getSession();
    console.log('🔍 Immediate session check after login:', immediateCheck.data.session ? `EXISTS - ${immediateCheck.data.session.user.email}` : 'NULL');
    
  } catch (error: any) {
    console.error('Native Google sign in error:', error);
    
    // Handle user cancellation - don't show error alert
    if (error.code === 'SIGN_IN_CANCELLED' || 
        error.code === '-5' || // User cancelled
        error.code === 'CANCELED' ||
        error.code === '12501' || // User cancelled (Android)
        error.message?.includes('cancelled') ||
        error.message?.includes('canceled') ||
        error.message?.toLowerCase().includes('user cancelled')) {
      console.log('👤 User cancelled Google sign-in');
      return; // Exit silently without showing error
    }
    
    // More specific error messages for actual errors
    if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      Alert.alert(
        'Google Play Services Required', 
        'Please update Google Play Services from the Play Store to continue.'
      );
    } else {
      Alert.alert('Google Sign-In failed', error.message || 'Unexpected error');
    }
  } finally {
    setIsLoading(false);
  }
};

// In welcome.tsx, update the handleGoogleSignIn function


  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: 'swipekart://auth/callback',
        },
      });
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in with Facebook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', error.message || 'Failed to sign in with Apple');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    // Navigate to email sign in screen (you'll need to create this)
    router.push('/(tabs)'); // Temporary - change to actual email signin route
  };

  const handleSignUp = () => {
    // Navigate to sign up screen (you'll need to create this)
    router.push('/(tabs)'); // Temporary - change to actual signup route
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <View style={styles.container}>
        {/* Top Section with Illustration and Text */}
        <Animated.View 
          style={[
            styles.topSection,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
            },
          ]}
        >
          {/* Title Above Image */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>
              Discover. Swipe.{'\n'}Shop & Share.
            </Text>
          </View>

          <View style={styles.illustrationContainer}>
            <Image
              source={require('@/assets/images/hero-new.png')}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Main Content Card - Now contains subtitle and buttons */}
        <Animated.View 
          style={[
            styles.contentCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Subtitle moved inside yellow card */}
          <View style={styles.subtitleSection}>
            <Text style={styles.subtitle}>
              Sign in or create your account
            </Text>
          </View>

          {/* Sign In Buttons */}
          <View style={styles.buttonContainer}>
            {/* Google Sign In */}
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <GoogleIcon />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
              {isLoading && <ActivityIndicator size="small" color="#757575" />}
            </TouchableOpacity>

            {/* Facebook Sign In
            <TouchableOpacity
              style={[styles.socialButton, styles.facebookButton]}
              onPress={handleFacebookSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <FacebookIcon />
              <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
              {isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
            </TouchableOpacity> */}

            {/* Apple Sign In (iOS only) */}
            {isAppleAvailable && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleSignIn}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <View style={styles.appleIcon}>
                  <Text style={styles.appleIconText} accessibilityLabel="Apple logo">🍎</Text>
                </View>
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
                {isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Sign In */}
            <TouchableOpacity
              style={[styles.socialButton, styles.emailButton]}
              onPress={handleEmailSignIn}
              activeOpacity={0.8}
            >
              <Text style={styles.emailButtonText}>Sign in with email</Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>
                Don't have an account?{' '}
                <Text style={styles.signUpLink} onPress={handleSignUp}>
                  Sign up
                </Text>
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  topSection: {
    flex: 0.55, // Reduced from 0.6 to 0.55
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontFamily: 'Nunito-Bold',
    color: '#333333',
    textAlign: 'center',
    lineHeight: 40,
  },
  illustrationContainer: {
    width: width * 0.7,
    height: width * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  subtitleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Medium',
    color: '#8B4513',
    textAlign: 'center',
  },
  contentCard: {
    flex: 0.45, // Increased from 0.4 to 0.45
    backgroundColor: BrandColors.primary, // Yellow background
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonContainer: {
    gap: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    minHeight: 48,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#333333',
    textAlign: 'center',
    // Remove flex: 1 and marginRight to bring text closer to icon
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  facebookIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facebookText: {
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    fontWeight: 'bold',
  },
  facebookButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  appleButton: {
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  appleIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  appleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  appleButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#B8860B',
    opacity: 0.4,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#8B4513',
    marginHorizontal: 20,
    letterSpacing: 0.5,
  },
  emailButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  emailButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#333333',
  },
  signUpContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  signUpText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#666666',
  },
  signUpLink: {
    fontFamily: 'Nunito-Bold',
    color: '#333333',
    textDecorationLine: 'underline',
  },
});