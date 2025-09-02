import { BrandColors } from '@/constants/Colors';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Image, StatusBar, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationFinish: () => void;
}

export default function ModernSplashScreen({ onAnimationFinish }: SplashScreenProps) {
  const cardScale = new Animated.Value(0.8);
  const cardFloat = new Animated.Value(20);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    console.log('🚀 SwipeKart Splash Screen Started!');
    
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(cardFloat, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      console.log('🚀 Splash animation completed!');
      onAnimationFinish();
    }, 4000);

    return () => {
      console.log('🚀 Splash screen cleanup');
      clearTimeout(timer);
    };
  }, [onAnimationFinish]);

  // Fallback illustration if image fails
  const renderFallbackIllustration = () => (
    <View style={styles.fallbackContainer}>
      <View style={styles.fallbackPhone}>
        <View style={styles.fallbackScreen} />
      </View>
      <View style={styles.fallbackCart} />
      <View style={styles.fallbackBag1} />
      <View style={styles.fallbackBag2} />
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={BrandColors.primary} />
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          
          {/* Animated card with shopping illustration */}
          <Animated.View 
            style={[
              styles.cardContainer,
              {
                transform: [
                  { scale: cardScale },
                  { translateY: cardFloat }
                ],
              },
            ]}
          >
            <Surface style={styles.illustrationCard} elevation={5}>
              {!imageError ? (
                <Image
                  source={require('@/assets/images/shopping-illustration.png')}
                  style={styles.illustrationImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('Image load error:', error);
                    setImageError(true);
                  }}
                />
              ) : (
                renderFallbackIllustration()
              )}
            </Surface>
          </Animated.View>

          {/* Text content with Nunito */}
          <View style={styles.textContainer}>
            <Text style={styles.mainTitle}>
              Discover, Swipe,{'\n'}Shop & Share{'\n'}Amazing Products
            </Text>
            
            <Text style={styles.subtitle}>
              Join the social shopping revolution.{'\n'}
              Find trending products, connect with{'\n'}
              friends, and shop together.
            </Text>
          </View>
        
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.primary,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },

  // Card section
  cardContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  illustrationCard: {
    width: width * 0.85,
    height: width * 0.7,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Illustration image
  illustrationImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },

  // Fallback illustration styles
  fallbackContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fallbackPhone: {
    width: 80,
    height: 120,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackScreen: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3756C7',
    borderRadius: 8,
  },
  fallbackCart: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 25,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  fallbackBag1: {
    position: 'absolute',
    top: 40,
    left: 40,
    width: 20,
    height: 25,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  fallbackBag2: {
    position: 'absolute',
    top: 50,
    right: 50,
    width: 18,
    height: 22,
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },

  // Text section - Using Nunito fonts
  textContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  mainTitle: {
    fontSize: 26,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
});