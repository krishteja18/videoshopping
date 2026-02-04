import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

interface LiquidSearchBarProps {
  onPress?: () => void;
}

export default function LiquidSearchBar({ onPress }: LiquidSearchBarProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/search' as any);
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      activeOpacity={0.9} 
      style={styles.container}
    >
      <BlurView intensity={30} tint="light" style={styles.blurContainer}>
        <View style={styles.innerRow}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <Text style={styles.placeholderText}>Search products, brands and videos</Text>
          <View style={styles.micIconContainer}>
             <Icon name="mic" size={18} color="#666" />
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 46,
    borderRadius: 24,
    marginTop: 8,
    // Modern subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: '#ffffff', // Matched to Profile Button
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // High opacity light
    justifyContent: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  searchIcon: {
    marginRight: 12,
    opacity: 0.6,
  },
  placeholderText: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'Nunito-Medium',
    flex: 1,
  },
  micIconContainer: {
    padding: 4,
    opacity: 0.6,
  },
});
