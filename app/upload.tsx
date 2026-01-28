import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
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

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 90; // 1.5 minutes


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
      const asset = result.assets[0];
      
      // 1. Check Duration
      if (asset.duration && asset.duration > MAX_VIDEO_DURATION * 1000) {
        Alert.alert('Video too long', `Please select a video under ${MAX_VIDEO_DURATION} seconds.`);
        return;
      }

      // 2. Check File Size (if available)
      if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
        Alert.alert('File too large', `Please select a video under ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`);
        return;
      }

      setVideo(asset);
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
    
    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');

    // Use FileSystem.uploadAsync to stream the file directly to Supabase
    // This bypasses the JS memory limit that crashes apps with large Base64 strings
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
    
    const response = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        'Content-Type': bucket === 'videos' ? 'video/mp4' : 'image/jpeg',
      },
    });

    if (response.status !== 200) {
      console.error('Upload failed:', response.body);
      throw new Error('Failed to upload file');
    }
    
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
  },
  videoPlaceholder: {
    height: 300,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  placeholderText: {
    color: '#666',
    marginTop: 10,
  },
  captionInput: {
    backgroundColor: '#111',
    color: '#fff',
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    margin: 20,
    marginBottom: 10,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  productTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productPrice: {
    color: '#aaa',
  },
  formCard: {
    backgroundColor: '#111',
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  formTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  imagePicker: {
    width: 80,
    height: 80,
    backgroundColor: '#222',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelButton: {
    padding: 10,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#888',
  },
  addButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  addProductText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  submitButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
