import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import { Octicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setAvatarFile(result.assets[0]);
        setAvatarUrl(result.assets[0].uri); // Preview
      }
    } catch (error) {
       Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return avatarUrl;

    try {
      const fileExt = avatarFile.uri.split('.').pop();
      const fileName = `${profile?.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: avatarFile.uri,
        name: fileName,
        type: `image/${fileExt}`
      } as any);

      // Using Supabase Storage 'avatars' bucket
      // Note: This requires the bucket to exist and have policies
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
            contentType: `image/${fileExt}`,
            upsert: true
        });

      if (uploadError) {
        // Fallback: If bucket doesn't exist or error, maybe alert user?
        // For now, assume it fails and throw
        throw uploadError;
      }

      // Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;

    } catch (error: any) {
      console.log('Avatar upload error:', error);
      throw new Error('Failed to upload avatar: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
        Alert.alert('Error', 'Username is required');
        return;
    }

    setLoading(true);
    try {
        let finalAvatarUrl = avatarUrl;
        if (avatarFile) {
            finalAvatarUrl = await uploadAvatar();
        }

        const updates = {
            full_name: fullName,
            username: username,
            bio: bio,
            website: website,
            avatar_url: finalAvatarUrl,
            updated_at: new Date().toISOString(),
        };



        await updateProfile(updates);

        Alert.alert('Success', 'Profile updated successfully', [
            { text: 'OK', onPress: () => router.back() }
        ]);

    } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
        setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen options={{ 
          headerShown: true,
          title: 'Edit Profile',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
          ),
          headerRight: () => (
              <TouchableOpacity onPress={handleSave} disabled={loading} style={{ paddingRight: 10 }}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : 
                     <Text style={{ color: '#20D6E6', fontSize: 16, fontWeight: 'bold' }}>Save</Text>
                  }
              </TouchableOpacity>
          )
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                <Image 
                    source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }} 
                    style={styles.avatar} 
                />
                <View style={styles.editIconOverlay}>
                    <Octicons name="pencil" size={16} color="#fff" />
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage}>
                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Name"
                placeholderTextColor="#666"
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor="#666"
                autoCapitalize="none"
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write a bio..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput
                style={styles.input}
                value={website}
                onChangeText={setWebsite}
                placeholder="Website"
                placeholderTextColor="#666"
                autoCapitalize="none"
            />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#333',
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  changePhotoText: {
    color: '#20D6E6',
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
