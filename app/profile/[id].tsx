import ProfileView from '@/components/ProfileView';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
          headerShown: true,
          title: '', // Empty title
          headerTransparent: true,
          headerTintColor: '#fff',
          headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Icon name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
          )
      }} />
      <ProfileView userId={id as string} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    marginLeft: -8, // Adjust for padding
  }
});
