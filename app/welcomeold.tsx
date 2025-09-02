// import { Input } from '@/components/ui/Input';
// import { BrandColors, Spacing } from '@/constants/Colors';
// import { useColorScheme } from '@/hooks/useColorScheme';
// import { supabase } from '@/lib/supabase';
// import * as AppleAuthentication from 'expo-apple-authentication';
// import React, { useEffect, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Animated,
//   Platform,
//   StatusBar,
//   StyleSheet,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { Text } from 'react-native-paper';

// type AuthStep = 'login' | 'email-sent';

// export default function WelcomeScreen() {
//   const isDark = useColorScheme() === 'dark';

//   // Core brand tokens
//   const PRIMARY_BG = BrandColors.primary;        // Splash background
//   const PRIMARY = BrandColors.primary;           // Core brand (used for header, accents)
//   const PRIMARY_DARK = BrandColors.primaryDark;
//   const SECONDARY = BrandColors.secondary;       // Action / CTA contrast
//   const TEXT_DARK = BrandColors.textPrimary;
//   const TEXT_MUTED = BrandColors.textSecondary;
//   const BORDER = BrandColors.borderLight;
//   const CARD_BG = BrandColors.cardBackground;
//   const INPUT_BG = BrandColors.inputBackground;

//   const [step, setStep] = useState<AuthStep>('login');
//   const [email, setEmail] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [isAppleAvailable, setIsAppleAvailable] = useState(false);

//   useEffect(() => {
//     if (Platform.OS === 'ios') {
//       AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
//     }
//   }, []);

//   // Simple entrance + crossfade
//   const fadeIn = useRef(new Animated.Value(0)).current;
//   const slideUp = useRef(new Animated.Value(30)).current;
//   const stepAnim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
//       Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
//     ]).start();
//   }, []);

//   useEffect(() => {
//     Animated.timing(stepAnim, {
//       toValue: step === 'login' ? 0 : 1,
//       duration: 350,
//       useNativeDriver: true,
//     }).start();
//   }, [step]);

//   const loginOpacity = stepAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
//   const sentOpacity  = stepAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
//   const loginShift   = stepAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
//   const sentShift    = stepAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

//   const handleEmailSignIn = async () => {
//     if (!email.trim()) {
//       Alert.alert('Email required', 'Please enter your email.');
//       return;
//     }
//     setIsLoading(true);
//     try {
//       const { error } = await supabase.auth.signInWithOtp({
//         email: email.trim(),
//         options: { emailRedirectTo: 'swipekart://auth/callback' },
//       });
//       if (error) throw error;
//       setStep('email-sent');
//     } catch (e: any) {
//       Alert.alert('Error', e.message || 'Failed to send link');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleGoogle = async () => {
//     setIsLoading(true);
//     try {
//       const { error } = await supabase.auth.signInWithOAuth({
//         provider: 'google',
//         options: { redirectTo: 'swipekart://auth/callback' },
//       });
//       if (error) throw error;
//     } catch (e: any) {
//       Alert.alert('Error', e.message || 'Google sign-in failed');
//     } finally { setIsLoading(false); }
//   };

//   const handleApple = async () => {
//     setIsLoading(true);
//     try {
//       const credential = await AppleAuthentication.signInAsync({
//         requestedScopes: [
//           AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
//           AppleAuthentication.AppleAuthenticationScope.EMAIL,
//         ],
//       });
//       if (credential.identityToken) {
//         const { error } = await supabase.auth.signInWithIdToken({
//           provider: 'apple',
//           token: credential.identityToken,
//         });
//         if (error) throw error;
//       }
//     } catch (e: any) {
//       if (e.code !== 'ERR_REQUEST_CANCELED') {
//         Alert.alert('Error', e.message || 'Apple sign-in failed');
//       }
//     } finally { setIsLoading(false); }
//   };

//   const backToLogin = () => {
//     setStep('login');
//     setEmail('');
//   };

//   return (
//     <>
//       <StatusBar barStyle="light-content" backgroundColor={PRIMARY_BG} />
//       <View style={[styles.screen, { backgroundColor: PRIMARY_BG }]}>
//         {/* Header (mirrors splash) */}
//         <View style={styles.header}>
//           <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
//             <View style={[styles.brandBadge, { backgroundColor: '#ffffff18', borderColor: '#ffffff40' }]}>
//               <Text style={[styles.brandBadgeText, { color: '#FFFFFF' }]}>SwipeKart</Text>
//             </View>
//             <Text style={[styles.title, { color: '#FFFFFF' }]}>
//               {step === 'login' ? 'Discover. Swipe.\nShop & Share.' : 'Magic link sent'}
//             </Text>
//             <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.85)' }]}>
//               {step === 'login'
//                 ? 'Sign in or create your account'
//                 : 'Open your email to continue'}
//             </Text>
//           </Animated.View>
//         </View>

//         {/* Card Area */}
//         <Animated.View
//           style={[
//             styles.card,
//             {
//               backgroundColor: CARD_BG,
//               shadowColor: PRIMARY_DARK,
//               opacity: fadeIn,
//               transform: [{ translateY: slideUp }],
//             },
//           ]}
//         >
//           {/* Login State */}
//             <Animated.View
//               pointerEvents={step === 'login' ? 'auto' : 'none'}
//               style={{
//                 position: step === 'login' ? 'relative' : 'absolute',
//                 width: '100%',
//                 opacity: loginOpacity,
//                 transform: [{ translateY: loginShift }],
//               }}
//             >
//               <Input
//                 placeholder="you@example.com"
//                 value={email}
//                 onChangeText={setEmail}
//                 keyboardType="email-address"
//                 autoCapitalize="none"
//                 containerStyle={{ marginBottom: Spacing.md }}
//               />

//               <TouchableOpacity
//                 activeOpacity={0.85}
//                 disabled={!email || isLoading}
//                 onPress={handleEmailSignIn}
//                 style={[
//                   styles.primaryButton,
//                   {
//                     backgroundColor: email ? SECONDARY : BORDER,
//                     shadowColor: email ? SECONDARY : 'transparent',
//                   },
//                 ]}
//               >
//                 {isLoading ? (
//                   <ActivityIndicator color="#fff" />
//                 ) : (
//                   <Text style={styles.primaryButtonText}>
//                     Continue with Email
//                   </Text>
//                 )}
//               </TouchableOpacity>

//               <View style={styles.dividerRow}>
//                 <View style={[styles.dividerLine, { backgroundColor: BORDER }]} />
//                 <Text style={[styles.dividerLabel, { color: TEXT_MUTED }]}>or continue with</Text>
//                 <View style={[styles.dividerLine, { backgroundColor: BORDER }]} />
//               </View>

//               <View style={styles.socialStack}>
//                 {isAppleAvailable && (
//                   <TouchableOpacity
//                     onPress={handleApple}
//                     disabled={isLoading}
//                     activeOpacity={0.85}
//                     style={[styles.socialButton, { backgroundColor: PRIMARY_DARK }]}
//                   >
//                     <Text style={styles.socialIcon}></Text>
//                     <Text style={styles.socialText}>Sign in with Apple</Text>
//                   </TouchableOpacity>
//                 )}

//                 <TouchableOpacity
//                   onPress={handleGoogle}
//                   disabled={isLoading}
//                   activeOpacity={0.85}
//                   style={[
//                     styles.socialButton,
//                     {
//                       backgroundColor: INPUT_BG,
//                       borderWidth: 1,
//                       borderColor: BORDER,
//                     },
//                   ]}
//                 >
//                   <Text style={[styles.socialIcon, { color: '#4285F4' }]}>G</Text>
//                   <Text style={[styles.socialText, { color: TEXT_DARK }]}>Sign in with Google</Text>
//                 </TouchableOpacity>
//               </View>

//               <Text style={[styles.terms, { color: TEXT_MUTED }]}>
//                 By continuing you agree to our <Text style={[styles.link, { color: SECONDARY }]}>Terms</Text> & <Text style={[styles.link, { color: SECONDARY }]}>Privacy</Text>.
//               </Text>
//             </Animated.View>

//           {/* Email Sent State */}
//             <Animated.View
//               pointerEvents={step === 'email-sent' ? 'auto' : 'none'}
//               style={{
//                 position: step === 'email-sent' ? 'relative' : 'absolute',
//                 width: '100%',
//                 alignItems: 'center',
//                 opacity: sentOpacity,
//                 transform: [{ translateY: sentShift }],
//               }}
//             >
//               <View style={[styles.sentIconCircle, { borderColor: SECONDARY, backgroundColor: `${SECONDARY}11` }]}>
//                 <Text style={styles.sentIcon}>📧</Text>
//               </View>
//               <Text style={[styles.sentTitle, { color: TEXT_DARK }]}>Check your inbox</Text>
//               <Text style={[styles.sentDesc, { color: TEXT_MUTED }]}>
//                 We emailed a magic link to{'\n'}
//                 <Text style={[styles.emailHighlight, { color: SECONDARY }]}>{email}</Text>
//               </Text>

//               <TouchableOpacity
//                 onPress={handleEmailSignIn}
//                 disabled={isLoading}
//                 activeOpacity={0.85}
//                 style={[styles.secondaryOutline, { borderColor: SECONDARY }]}
//               >
//                 {isLoading ? (
//                   <ActivityIndicator color={SECONDARY} />
//                 ) : (
//                   <Text style={[styles.secondaryOutlineText, { color: SECONDARY }]}>Resend link</Text>
//                 )}
//               </TouchableOpacity>

//               <TouchableOpacity onPress={backToLogin} activeOpacity={0.7} style={{ marginTop: Spacing.md }}>
//                 <Text style={[styles.backLink, { color: TEXT_MUTED }]}>← Use a different email</Text>
//               </TouchableOpacity>
//             </Animated.View>
//         </Animated.View>
//       </View>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   screen: {
//     flex: 1,
//   },
//   header: {
//     flex: 0.5,
//     justifyContent: 'flex-end',
//     paddingHorizontal: Spacing.lg,
//     paddingBottom: Spacing.xl,
//   },
//   brandBadge: {
//     alignSelf: 'flex-start',
//     paddingHorizontal: Spacing.md,
//     paddingVertical: 6,
//     borderRadius: 18,
//     borderWidth: 1,
//     marginBottom: Spacing.md,
//   },
//   brandBadgeText: {
//     fontFamily: 'Nunito-SemiBold',
//     fontSize: 13,
//     letterSpacing: 0.5,
//   },
//   title: {
//     fontFamily: 'Nunito-Bold',
//     fontSize: 30,
//     lineHeight: 36,
//     marginBottom: Spacing.sm,
//   },
//   subtitle: {
//     fontFamily: 'Nunito-Medium',
//     fontSize: 14,
//     lineHeight: 20,
//   },
//   card: {
//     flex: 1,
//     borderTopLeftRadius: 28,
//     borderTopRightRadius: 28,
//     paddingHorizontal: Spacing.lg,
//     paddingTop: Spacing.xl,
//     shadowOpacity: 0.12,
//     shadowOffset: { width: 0, height: -4 },
//     shadowRadius: 20,
//     elevation: 10,
//   },
//   primaryButton: {
//     borderRadius: 14,
//     paddingVertical: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 4,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//   },
//   primaryButtonText: {
//     fontFamily: 'Nunito-Bold',
//     fontSize: 16,
//     color: '#FFFFFF',
//     letterSpacing: 0.5,
//   },
//   dividerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: Spacing.lg,
//   },
//   dividerLine: {
//     flex: 1,
//     height: 1,
//     borderRadius: 1,
//   },
//   dividerLabel: {
//     fontFamily: 'Nunito-SemiBold',
//     fontSize: 11,
//     marginHorizontal: Spacing.md,
//     letterSpacing: 0.5,
//     textTransform: 'uppercase',
//   },
//   socialStack: {
//     gap: Spacing.md,
//   },
//   socialButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     paddingVertical: 14,
//     paddingHorizontal: 18,
//     borderRadius: 14,
//     justifyContent: 'center',
//   },
//   socialIcon: {
//     fontSize: 18,
//     fontFamily: 'Nunito-Bold',
//   },
//   socialText: {
//     fontFamily: 'Nunito-SemiBold',
//     fontSize: 14,
//     letterSpacing: 0.3,
//     color: '#FFFFFF',
//   },
//   terms: {
//     fontSize: 11,
//     fontFamily: 'Nunito-Regular',
//     textAlign: 'center',
//     marginTop: Spacing.lg,
//     lineHeight: 16,
//   },
//   link: {
//     fontFamily: 'Nunito-SemiBold',
//   },
//   sentIconCircle: {
//     width: 86,
//     height: 86,
//     borderRadius: 43,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 2,
//     marginBottom: Spacing.lg,
//     marginTop: 4,
//   },
//   sentIcon: {
//     fontSize: 38,
//   },
//   sentTitle: {
//     fontFamily: 'Nunito-Bold',
//     fontSize: 22,
//     marginBottom: Spacing.sm,
//   },
//   sentDesc: {
//     fontFamily: 'Nunito-Regular',
//     fontSize: 14,
//     textAlign: 'center',
//     lineHeight: 20,
//     marginBottom: Spacing.lg,
//   },
//   emailHighlight: {
//     fontFamily: 'Nunito-SemiBold',
//   },
//   secondaryOutline: {
//     borderWidth: 1.5,
//     borderRadius: 14,
//     paddingVertical: 14,
//     paddingHorizontal: 24,
//     alignItems: 'center',
//     width: '100%',
//   },
//   secondaryOutlineText: {
//     fontFamily: 'Nunito-SemiBold',
//     fontSize: 15,
//   },
//   backLink: {
//     fontFamily: 'Nunito-SemiBold',
//     fontSize: 13,
//   },
// });



import { Input } from '@/components/ui/Input';
import { BrandColors, Spacing } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';

type AuthStep = 'login' | 'email-sent';

export default function WelcomeScreen() {
  const PRIMARY = BrandColors.primary;
  const PRIMARY_DARK = BrandColors.primaryDark;
  const ACCENT = BrandColors.secondary;
  const TEXT_DARK = BrandColors.textPrimary;
  const TEXT_MUTED = BrandColors.textSecondary;
  const BORDER = BrandColors.borderLight;
  const INPUT_BG = BrandColors.inputBackground;

  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Animations
  const fade = useRef(new Animated.Value(0)).current;
  const heroRise = useRef(new Animated.Value(30)).current;
  const sheetUp = useRef(new Animated.Value(60)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(heroRise, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(sheetUp, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(stepAnim, {
      toValue: step === 'login' ? 0 : 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const loginOpacity = stepAnim.interpolate({ inputRange: [0,1], outputRange:[1,0] });
  const sentOpacity  = stepAnim.interpolate({ inputRange: [0,1], outputRange:[0,1] });
  const loginShift   = stepAnim.interpolate({ inputRange: [0,1], outputRange:[0,-16] });
  const sentShift    = stepAnim.interpolate({ inputRange: [0,1], outputRange:[16,0] });

  const handleEmailSignIn = async () => {
    if (!email.trim()) {
      Alert.alert('Email required','Enter your email.');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: 'swipekart://auth/callback' }
      });
      if (error) throw error;
      setStep('email-sent');
    } catch (e:any) {
      Alert.alert('Error', e.message || 'Failed to send link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'swipekart://auth/callback' }
      });
      if (error) throw error;
    } catch (e:any) {
      Alert.alert('Error', e.message || 'Google sign-in failed');
    } finally { setIsLoading(false); }
  };

  const handleApple = async () => {
    setIsLoading(true);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (cred.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: cred.identityToken,
        });
        if (error) throw error;
      }
    } catch (e:any) {
      if (e.code !== 'ERR_REQUEST_CANCELED')
        Alert.alert('Error', e.message || 'Apple sign-in failed');
    } finally { setIsLoading(false); }
  };

  const backToLogin = () => {
    setStep('login');
    setEmail('');
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <View style={[styles.root, { backgroundColor: PRIMARY }]}>
        {/* HERO */}
        <Animated.View
          style={[
            styles.hero,
            { opacity: fade, transform: [{ translateY: heroRise }] }
          ]}
        >
          <View style={styles.heroImageWrap}>
            <Image
              source={require('@/assets/images/hero-illustration.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* SHEET */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetUp }] }
          ]}
        >
          <Animated.View
            style={{
              opacity: loginOpacity,
              transform: [{ translateY: loginShift }],
              position: step === 'login' ? 'relative' : 'absolute',
              width: '100%'
            }}
            pointerEvents={step === 'login' ? 'auto' : 'none'}
          >
            <Text style={styles.heading}>
              Shop Smarter,
              {'\n'}Skip the <Text style={[styles.highlight,{ color: ACCENT }]}>Wait</Text>
            </Text>
            <Text style={[styles.subheading,{ color: TEXT_MUTED }]}>
              Sign in to unlock curated trends and faster checkout.
            </Text>

            <Input
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={{ marginTop: Spacing.lg, marginBottom: Spacing.md }}
            />

            <TouchableOpacity
              onPress={handleEmailSignIn}
              disabled={!email || isLoading}
              activeOpacity={0.9}
              style={[
                styles.primaryCta,
                { backgroundColor: email ? ACCENT : BORDER, shadowColor: email ? ACCENT : 'transparent' }
              ]}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryCtaText}>Get Magic Link</Text>}
            </TouchableOpacity>

            <View style={styles.socialRow}>
              {isAppleAvailable && (
                <TouchableOpacity
                  onPress={handleApple}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  style={[styles.socialCircle,{ backgroundColor: PRIMARY_DARK }]}
                >
                  <Text style={styles.socialGlyph}></Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleGoogle}
                disabled={isLoading}
                activeOpacity={0.85}
                style={[styles.socialCircle,{ backgroundColor: '#FFFFFF', borderWidth:1, borderColor: BORDER }]}
              >
                <Text style={[styles.socialGlyph,{ color:'#4285F4' }]}>G</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.legal,{ color: TEXT_MUTED }]}>
              By continuing you agree to our <Text style={[styles.legalLink,{ color: ACCENT }]}>Terms</Text> & <Text style={[styles.legalLink,{ color: ACCENT }]}>Privacy</Text>.
            </Text>
          </Animated.View>

          {/* EMAIL SENT */}
          <Animated.View
            style={{
              opacity: sentOpacity,
              transform: [{ translateY: sentShift }],
              position: step === 'email-sent' ? 'relative' : 'absolute',
              width: '100%',
              alignItems: 'center'
            }}
            pointerEvents={step === 'email-sent' ? 'auto' : 'none'}
          >
            <View style={[styles.mailRing,{ borderColor: ACCENT, backgroundColor: ACCENT + '14' }]}>
              <Text style={{ fontSize: 34 }}>📧</Text>
            </View>
            <Text style={styles.sentHeading}>Check your inbox</Text>
            <Text style={[styles.sentBody,{ color: TEXT_MUTED }]}>
              We sent a secure link to{'\n'}
              <Text style={{ color: ACCENT, fontWeight:'600' }}>{email}</Text>
            </Text>

            <TouchableOpacity
              onPress={handleEmailSignIn}
              disabled={isLoading}
              activeOpacity={0.9}
              style={[styles.outlineBtn,{ borderColor: ACCENT }]}
            >
              {isLoading
                ? <ActivityIndicator color={ACCENT} />
                : <Text style={[styles.outlineText,{ color: ACCENT }]}>Resend Link</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={backToLogin} style={{ marginTop: Spacing.md }}>
              <Text style={[styles.backLink,{ color: TEXT_MUTED }]}>← Use a different email</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex:1 },
  hero: {
    flex:0.55,
    alignItems:'center',
    justifyContent:'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: 40,
  },
  heroImageWrap: {
    width:'100%',
    height:'100%',
    alignItems:'center',
    justifyContent:'flex-end',
    paddingBottom:20,
  },
  heroImage: {
    width:'90%',
    height:'85%',
  },
  sheet: {
    flex:1,
    backgroundColor: BrandColors.cardBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    shadowColor:'#000',
    shadowOpacity:0.15,
    shadowOffset:{ width:0, height:-4 },
    shadowRadius:18,
    elevation:14,
  },
  heading: {
    fontFamily:'Nunito-Bold',
    fontSize:30,
    lineHeight:36,
    color: BrandColors.textPrimary,
  },
  highlight: {
    fontFamily:'Nunito-ExtraBold',
  },
  subheading: {
    fontFamily:'Nunito-Regular',
    fontSize:14,
    lineHeight:20,
    marginTop:8,
  },
  primaryCta: {
    marginTop:4,
    borderRadius:16,
    paddingVertical:16,
    alignItems:'center',
    justifyContent:'center',
    shadowOffset:{ width:0, height:4 },
    shadowOpacity:0.25,
    shadowRadius:8,
  },
  primaryCtaText: {
    fontFamily:'Nunito-Bold',
    fontSize:16,
    color:'#FFFFFF',
  },
  socialRow: {
    flexDirection:'row',
    gap:14,
    marginTop:Spacing.lg,
    marginBottom:Spacing.sm,
  },
  socialCircle: {
    width:54,
    height:54,
    borderRadius:27,
    alignItems:'center',
    justifyContent:'center',
  },
  socialGlyph: {
    fontSize:20,
    fontFamily:'Nunito-Bold',
    color:'#FFFFFF',
  },
  legal: {
    fontSize:11,
    lineHeight:16,
    fontFamily:'Nunito-Regular',
    marginTop:Spacing.md,
  },
  legalLink: {
    fontFamily:'Nunito-SemiBold',
  },
  mailRing: {
    width:92,
    height:92,
    borderRadius:46,
    borderWidth:2,
    alignItems:'center',
    justifyContent:'center',
    marginBottom:Spacing.lg,
  },
  sentHeading: {
    fontFamily:'Nunito-Bold',
    fontSize:22,
    color: BrandColors.textPrimary,
    marginBottom:Spacing.sm,
  },
  sentBody: {
    fontFamily:'Nunito-Regular',
    fontSize:14,
    textAlign:'center',
    lineHeight:20,
    marginBottom:Spacing.lg,
  },
  outlineBtn: {
    width:'100%',
    borderWidth:1.5,
    borderRadius:16,
    paddingVertical:14,
    alignItems:'center',
  },
  outlineText: {
    fontFamily:'Nunito-SemiBold',
    fontSize:15,
  },
  backLink: {
    fontFamily:'Nunito-SemiBold',
    fontSize:13,
  },
});

