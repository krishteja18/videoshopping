import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

type Product = {
  title: string;
  price: string;
  imageUri: string;
  description: string;
};

export default function UploadScreen() {
  const { profile } = useUserStore();
  const [uploading, setUploading] = useState(false);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  
  // Product Form State
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [tempProduct, setTempProduct] = useState<Product>({ title: '', price: '', imageUri: '', description: '' });

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setVideo(result.assets[0]);
    }
  };

  const pickProductImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setTempProduct({ ...tempProduct, imageUri: result.assets[0].uri });
    }
  };

  const addProduct = () => {
    if (!tempProduct.title || !tempProduct.price || !tempProduct.imageUri) {
      Alert.alert('Error', 'Please fill all product fields and select an image');
      return;
    }
    setProducts([...products, tempProduct]);
    setTempProduct({ title: '', price: '', imageUri: '', description: '' });
    setShowProductForm(false);
  };

  const uploadFile = async (uri: string, bucket: string, folder: string) => {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${folder}/${Date.now()}.${ext}`;
    
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, decode(base64), {
        contentType: bucket === 'videos' ? 'video/mp4' : 'image/jpeg',
        upsert: false
      });

    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!video) {
        Alert.alert('Error', 'Please select a video');
        return;
    }
    if (products.length === 0) {
        Alert.alert('Error', 'Please add at least one product');
        return;
    }
    if (!profile) {
        Alert.alert('Error', 'User profile not found. Please log in again.');
        return;
    }

    try {
      setUploading(true);
      
      // 1. Upload Video
      const videoUrl = await uploadFile(video.uri, 'videos', profile.id);
      
      // 2. Insert Video Record
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert({
          seller_id: profile.id,
          video_url: videoUrl,
          description: caption,
        })
        .select()
        .single();
      
      if (videoError) throw videoError;

      // 3. Process Products
      for (const prod of products) {
        // Upload image
        const imageUrl = await uploadFile(prod.imageUri, 'product-images', profile.id);
        
        // Create Product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .insert({
            seller_id: profile.id,
            title: prod.title,
            price: parseFloat(prod.price),
            description: prod.description,
            image_url: imageUrl,
          })
          .select()
          .single();

        if (productError) throw productError;

        // Link Video <-> Product
        const { error: linkError } = await supabase
          .from('video_products')
          .insert({
            video_id: videoData.id,
            product_id: productData.id,
          });

        if (linkError) throw linkError;
      }

      Alert.alert('Success', 'Video uploaded successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Upload Video', headerTintColor: '#fff', headerStyle: { backgroundColor: '#000' } }} />
      <ScrollView style={styles.container}>
        {/* Video Section */}
        <TouchableOpacity style={styles.videoPlaceholder} onPress={pickVideo}>
          {video ? (
            <View style={styles.videoSelected}>
                <Image source={{ uri: video.uri }} style={styles.videoPreview} resizeMode="cover" /> 
                {/* Note: In real app use Video component for preview, Image works for thumbnails often generated by picker */}
                <View style={styles.changeOverlay}>
                    <Icon name="edit-2" size={24} color="#fff" />
                </View>
            </View>
          ) : (
            <>
              <Icon name="video" size={40} color="#666" />
              <Text style={styles.placeholderText}>Select Video</Text>
            </>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.captionInput}
          placeholder="Write a caption..."
          placeholderTextColor="#666"
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        {/* Products List */}
        <Text style={styles.sectionTitle}>Products ({products.length})</Text>
        
        {products.map((p, i) => (
          <View key={i} style={styles.productCard}>
            <Image source={{ uri: p.imageUri }} style={styles.productThumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle}>{p.title}</Text>
              <Text style={styles.productPrice}>${p.price}</Text>
            </View>
            <TouchableOpacity onPress={() => setProducts(products.filter((_, idx) => idx !== i))}>
                <Icon name="x" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Product Form */}
        {showProductForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Product</Text>
            
            <TouchableOpacity style={styles.imagePicker} onPress={pickProductImage}>
              {tempProduct.imageUri ? (
                <Image source={{ uri: tempProduct.imageUri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                    <Icon name="image" size={24} color="#666" />
                    <Text style={{ color: '#666', fontSize: 12 }}>Add Image</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Product Title"
              placeholderTextColor="#666"
              value={tempProduct.title}
              onChangeText={t => setTempProduct({...tempProduct, title: t})}
            />
            <TextInput
              style={styles.input}
              placeholder="Price ($)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={tempProduct.price}
              onChangeText={t => setTempProduct({...tempProduct, price: t})}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (Optional)"
              placeholderTextColor="#666"
              value={tempProduct.description}
              onChangeText={t => setTempProduct({...tempProduct, description: t})}
            />

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowProductForm(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={addProduct}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addProductBtn} onPress={() => setShowProductForm(true)}>
            <Icon name="plus" size={20} color="#000" />
            <Text style={styles.addProductText}>Add Product</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.submitButton, uploading && { opacity: 0.5 }]} 
            onPress={handleSubmit}
            disabled={uploading}
        >
          {uploading ? (
             <ActivityIndicator color="#000" />
          ) : (
             <Text style={styles.submitButtonText}>Post Video</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  videoPlaceholder: {
    height: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  videoSelected: {
      width: '100%',
      height: '100%',
  },
  videoPreview: {
      width: '100%',
      height: '100%',
  },
  changeOverlay: {
      position: 'absolute',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 8,
      borderRadius: 20,
      bottom: 8,
      right: 8,
  },
  placeholderText: {
    color: '#666',
    marginTop: 8,
  },
  captionInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
  },
  addProductText: {
    color: '#000',
    fontWeight: 'bold',
  },
  
  // Product List
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  productTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  productPrice: {
    color: '#aaa',
  },

  // Form
  formCard: {
      backgroundColor: '#1a1a1a',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333',
      marginBottom: 20,
  },
  formTitle: {
      color: '#fff',
      fontWeight: 'bold',
      marginBottom: 12,
  },
  imagePicker: {
      height: 100,
      width: 100,
      borderRadius: 8,
      backgroundColor: '#2a2a2a',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      overflow: 'hidden',
  },
  imagePreview: {
      width: '100%',
      height: '100%',
  },
  imagePlaceholder: {
      alignItems: 'center',
      gap: 4,
  },
  input: {
      backgroundColor: '#2a2a2a',
      borderRadius: 8,
      padding: 10,
      color: '#fff',
      marginBottom: 12,
  },
  formActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 8,
  },
  cancelButton: {
      padding: 10,
  },
  cancelButtonText: {
      color: '#aaa',
  },
  addButton: {
      backgroundColor: '#20D6E6',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
  },
  addButtonText: {
      color: '#000',
      fontWeight: 'bold',
  },

  footer: {
      backgroundColor: '#000',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#1a1a1a',
  },
  submitButton: {
      backgroundColor: '#FF2E5B',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
  },
  submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
});
