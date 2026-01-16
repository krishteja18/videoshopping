import { useUserStore } from '@/store/useStore';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface ProfileViewProps {
  onSignOut: () => void;
}

export default function ProfileView({ onSignOut }: ProfileViewProps) {
  const { profile, isLoading, fetchProfile, updateProfile } = useUserStore();

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  const handleBecomeSeller = async () => {
    try {
      await updateProfile({ role: 'seller' });
      Alert.alert('Success', 'You are now a Seller!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (isLoading && !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }} 
          style={styles.avatar} 
        />
        <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        <Text style={styles.username}>@{profile?.username || 'username'}</Text>
        
        <View style={[styles.roleBadge, profile?.role === 'seller' ? styles.sellerBadge : styles.buyerBadge]}>
          <Text style={styles.roleText}>{profile?.role?.toUpperCase() || 'BUYER'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {profile?.role !== 'seller' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleBecomeSeller}>
            <Icon name="briefcase" size={20} color="#fff" />
            <Text style={styles.actionText}>Become a Seller</Text>
          </TouchableOpacity>
        )}

        {profile?.role === 'seller' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/upload')}>
            <Icon name="upload-cloud" size={20} color="#fff" />
            <Text style={styles.actionText}>Upload Video & Products</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.actionButton, styles.signOutButton]} onPress={onSignOut}>
          <Icon name="log-out" size={20} color="#FF3B30" />
          <Text style={[styles.actionText, styles.signOutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    paddingTop: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  buyerBadge: {
    backgroundColor: '#20D6E6',
  },
  sellerBadge: {
    backgroundColor: '#FF2E5B',
  },
  roleText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  actions: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  signOutText: {
    color: '#FF3B30',
  },
});
