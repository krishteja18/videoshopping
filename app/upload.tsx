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
  imageUris: string[];
  description: string;
  category: string;
  specifications?: Record<string, any>;
  hasVariants?: boolean;
  variants?: { name: string; options: string[] }[]; // e.g. [{name: 'Color', options: ['Red', 'Blue']}]
  generatedVariants?: { id: string; name: string; price: string; stock: string; options?: any }[];
};

// Configuration for Dynamic Fields
const CATEGORY_CONFIG: Record<string, { label: string; key: string; type: 'text' | 'select'; options?: string[] }[]> = {
  'fashion': [
    { label: 'Material', key: 'material', type: 'text' },
    { label: 'Fit', key: 'fit', type: 'select', options: ['Slim', 'Regular', 'Oversized', 'Skinny'] },
    { label: 'Pattern', key: 'pattern', type: 'text' },
    { label: 'Care Instructions', key: 'care_instructions', type: 'text' }
  ],
  'electronics': [
    { label: 'Warranty (Months)', key: 'warranty', type: 'text' },
    { label: 'Screen Size', key: 'screen_size', type: 'text' },
    { label: 'Storage', key: 'storage', type: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { label: 'Battery Capacity', key: 'battery', type: 'text' }
  ],
  'home-living': [
    { label: 'Dimensions (LxWxH)', key: 'dimensions', type: 'text' },
    { label: 'Weight (kg)', key: 'weight', type: 'text' },
    { label: 'Material', key: 'material', type: 'text' }
  ],
  'beauty': [
    { label: 'Volume', key: 'volume', type: 'select', options: ['50ml', '100ml', '200ml', '500ml'] },
    { label: 'Skin Type', key: 'skin_type', type: 'select', options: ['All', 'Dry', 'Oily', 'Sensitive'] },
    { label: 'Ingredients', key: 'ingredients', type: 'text' }
  ]
};

const CATEGORIES: any[] = []; // Will fetch from DB

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 90; // 1.5 minutes


export default function UploadScreen() {
  const { profile } = useUserStore();
  const [uploading, setUploading] = useState(false);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Category, 2: Details, 3: Variants
  const [categories, setCategories] = useState<any[]>([]);
  const [tempProduct, setTempProduct] = useState<Product>({ title: '', price: '', imageUris: [], description: '', category: '', specifications: {}, variants: [], generatedVariants: [] });
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantValues, setNewVariantValues] = useState('');

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

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
      allowsEditing: true, // You might want to disable this if selecting multiple at once is desired, but expo-image-picker single selection with editing is standard. To allow multiple, we need 'allowsMultipleSelection: true' (if supported) or just call this contentiously.
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setTempProduct({ ...tempProduct, imageUris: [...tempProduct.imageUris, result.assets[0].uri] });
    }
  };

  const addProduct = () => {
    if (!tempProduct.title || !tempProduct.price || tempProduct.imageUris.length === 0 || !tempProduct.category) {
      Alert.alert('Error', 'Please fill all fields, select at least one image, and choose a category');
      return;
    }
    setProducts([...products, tempProduct]);
    setTempProduct({ title: '', price: '', imageUris: [], description: '', category: '', specifications: {}, variants: [], generatedVariants: [] });
    setShowProductForm(false);
    setStep(1); // Reset step
  };

  const handleNext = () => {
      // Check if category needs variants (hardcoded for Fashion now, or check slug)
      if (tempProduct.category === 'fashion') {
          setStep(3);
      } else {
          addProduct();
      }
  };

  const addVariantOption = () => {
      if (!newVariantName || !newVariantValues) return;
      const options = newVariantValues.split(',').map(s => s.trim()).filter(Boolean);
      
      const newGroup = { name: newVariantName, options };
      const updatedVariants = [...(tempProduct.variants || []), newGroup];

      // Recursively generate Cartesian product
      const generateCartesian = (groups: { name: string; options: string[] }[]) => {
          if (groups.length === 0) return [];
          
          let results: { name: string; options: any }[] = groups[0].options.map(opt => ({ 
              name: opt, 
              options: { [groups[0].name]: opt } 
          }));

          for (let i = 1; i < groups.length; i++) {
              const nextGroup = groups[i];
              const newResults: { name: string; options: any }[] = [];
              
              for (const res of results) {
                  for (const opt of nextGroup.options) {
                      newResults.push({
                          name: `${res.name} / ${opt}`,
                          options: { ...res.options, [nextGroup.name]: opt }
                      });
                  }
              }
              results = newResults;
          }
          return results;
      };

      const combinations = generateCartesian(updatedVariants);
      
      const generated = combinations.map(c => ({
          id: Math.random().toString(),
          name: c.name,
          price: tempProduct.price,
          stock: '10',
          options: c.options
      }));

      setTempProduct({
          ...tempProduct,
          variants: updatedVariants,
          generatedVariants: generated
      });
      setNewVariantName('');
      setNewVariantValues('');
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
        // Upload all images
        const uploadedImageUrls = [];
        for (const uri of prod.imageUris) {
            const iUrl = await uploadFile(uri, 'product-images', profile.id);
            uploadedImageUrls.push(iUrl);
        }
        
        const mainImageUrl = uploadedImageUrls[0];
        
        // Create Product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .insert({
            seller_id: profile.id,
            title: prod.title,
            price: parseFloat(prod.price),
            description: prod.description,
            image_url: mainImageUrl, // Keep backward compatibility
            images: uploadedImageUrls,
            category: prod.category,
            specifications: prod.specifications || {}, // Save the dynamic specs
          })
          .select()
          .single();

        if (productError) throw productError;

        // 4. Insert Variants (if any)
        if (prod.generatedVariants && prod.generatedVariants.length > 0) {
            const variantsToInsert = prod.generatedVariants.map(v => ({
                product_id: productData.id,
                variant_name: v.name,
                price: parseFloat(v.price) || parseFloat(prod.price),
                stock_quantity: parseInt(v.stock) || 0,
                sku: `${productData.id}-${v.name.replace(/[^a-zA-Z0-9]/g, '-')}`, // sanitized SKU
                options: v.options // Use the options object generated by cartesian
            }));

            const { error: variantError } = await supabase
                .from('product_variants')
                .insert(variantsToInsert);
            
            if (variantError) throw variantError;
        }

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
            <Image source={{ uri: p.imageUris[0] }} style={styles.productThumb} />
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
              <View style={styles.formHeader}>
                 <Text style={styles.formTitle}>{step === 1 ? 'Select Category' : 'Product Details'}</Text>
                 {step === 2 && (
                     <TouchableOpacity onPress={() => setStep(1)}>
                         <Text style={{  color: '#888', marginRight: 10 }}>Change</Text>
                     </TouchableOpacity>
                 )}
                 {step === 3 && (
                     <TouchableOpacity onPress={() => setStep(2)}>
                         <Text style={{  color: '#888', marginRight: 10 }}>Back</Text>
                     </TouchableOpacity>
                 )}
              </View>
              
              {step === 1 ? (
                  /* Step 1: Category Selection */
                  <View style={styles.categoryGrid}>
                      {categories.map((cat) => (
                          <TouchableOpacity 
                            key={cat.id} 
                            style={styles.categoryCard}
                            onPress={() => {
                                setTempProduct({ ...tempProduct, category: cat.slug }); // Store slug
                                setStep(2);
                            }}
                          >
                              <View style={styles.categoryIconCircle}>
                                  <Icon name={cat.icon || 'box'} size={24} color="#000" />
                              </View>
                              <Text style={styles.categoryCardText}>{cat.name}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
              ) : step === 2 ? (
                  /* Step 2: Basic Details */
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                      <TouchableOpacity style={styles.imagePicker} onPress={pickProductImage}>
                          <Icon name="camera" size={24} color="#666" />
                          <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>Add</Text>
                      </TouchableOpacity>
                      
                      {tempProduct.imageUris.map((uri, idx) => (
                        <View key={idx} style={styles.imagePreviewContainer}>
                            <Image source={{ uri }} style={styles.imagePreview} />
                            <TouchableOpacity 
                                style={styles.removeImageBtn}
                                onPress={() => setTempProduct({
                                    ...tempProduct, 
                                    imageUris: tempProduct.imageUris.filter((_, i) => i !== idx)
                                })}
                            >
                                <Icon name="x" size={12} color="#fff" />
                            </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>

                    <TextInput
                      style={styles.input}
                      placeholder="Product Title"
                      placeholderTextColor="#666"
                      value={tempProduct.title}
                      onChangeText={t => setTempProduct({...tempProduct, title: t})}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Price (₹)"
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

                    {/* Show Selected Category */}
                    <View style={styles.selectedCategoryChip}>
                        <Text style={{ color: '#888', fontSize: 12 }}>Category: </Text>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{categories.find(c => c.slug === tempProduct.category)?.name}</Text>
                    </View>

                    {/* Dynamic Attributes Form */}
                    {CATEGORY_CONFIG[tempProduct.category]?.length > 0 && (
                        <View style={styles.dynamicFormSection}>
                            <Text style={styles.sectionHeader}>Product Attributes</Text>
                            {CATEGORY_CONFIG[tempProduct.category].map((field) => (
                                <View key={field.key} style={{ marginBottom: 10 }}>
                                    <Text style={styles.fieldLabel}>{field.label}</Text>
                                    {field.type === 'select' ? (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                            {field.options?.map(opt => (
                                                <TouchableOpacity
                                                    key={opt}
                                                    onPress={() => setTempProduct(prev => ({
                                                        ...prev,
                                                        specifications: { ...prev.specifications, [field.key]: opt }
                                                    }))}
                                                    style={[
                                                        styles.optionChip,
                                                        tempProduct.specifications?.[field.key] === opt && styles.optionChipSelected
                                                    ]}
                                                >
                                                    <Text style={[
                                                        styles.optionChipText,
                                                        tempProduct.specifications?.[field.key] === opt && styles.optionChipTextSelected
                                                    ]}>{opt}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    ) : (
                                        <TextInput
                                            style={styles.input}
                                            placeholder={field.label}
                                            placeholderTextColor="#666"
                                            value={tempProduct.specifications?.[field.key] || ''}
                                            onChangeText={(text) => setTempProduct(prev => ({
                                                ...prev,
                                                specifications: { ...prev.specifications, [field.key]: text }
                                            }))}
                                        />
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.formActions}>
                      <TouchableOpacity style={styles.cancelButton} onPress={() => setShowProductForm(false)}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.addButton} onPress={handleNext}>
                        <Text style={styles.addButtonText}>{tempProduct.category === 'fashion' ? 'Next (Variants)' : 'Add Product'}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
              ) : (
                  /* Step 3: Variants (Fashion Only) */
                  <View>
                      <Text style={styles.fieldLabel}>Add Variations (e.g. Size, Color)</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                          <TextInput 
                              style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                              placeholder="Name (e.g. Size)" 
                              placeholderTextColor="#666"
                              value={newVariantName}
                              onChangeText={setNewVariantName}
                          />
                          <TextInput 
                              style={[styles.input, { flex: 2, marginBottom: 0 }]} 
                              placeholder="Values (S, M, L)" 
                              placeholderTextColor="#666"
                              value={newVariantValues}
                              onChangeText={setNewVariantValues}
                          />
                      </View>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={addVariantOption}>
                          <Text style={styles.secondaryBtnText}>+ Add Option Group</Text>
                      </TouchableOpacity>

                      {/* List of Added Groups */}
                      <View style={{ marginBottom: 15 }}>
                          {tempProduct.variants?.map((v, i) => (
                              <View key={i} style={styles.addedGroupChip}>
                                  <Text style={styles.addedGroupText}>
                                      <Text style={{ fontWeight: 'bold' }}>{v.name}: </Text> 
                                      {v.options.join(', ')}
                                  </Text>
                              </View>
                          ))}
                      </View>

                      <ScrollView style={{ maxHeight: 200, marginTop: 15 }}>
                          {tempProduct.generatedVariants?.map((v, i) => (
                              <View key={i} style={styles.variantRow}>
                                  <Text style={styles.variantName}>{v.name}</Text>
                                  <TextInput 
                                    style={styles.variantInput} 
                                    value={v.price} 
                                    placeholder="Price"
                                    placeholderTextColor="#555"
                                    onChangeText={(tx) => {
                                        const updated = [...(tempProduct.generatedVariants || [])];
                                        updated[i].price = tx;
                                        setTempProduct({...tempProduct, generatedVariants: updated});
                                    }}
                                  />
                                  <TextInput 
                                    style={styles.variantInput} 
                                    value={v.stock} 
                                    placeholder="Stock"
                                    placeholderTextColor="#555"
                                    onChangeText={(tx) => {
                                        const updated = [...(tempProduct.generatedVariants || [])];
                                        updated[i].stock = tx;
                                        setTempProduct({...tempProduct, generatedVariants: updated});
                                    }}
                                  />
                              </View>
                          ))}
                      </ScrollView>

                      <View style={styles.formActions}>
                        <TouchableOpacity style={styles.addButton} onPress={addProduct}>
                            <Text style={styles.addButtonText}>Finish & Add</Text>
                        </TouchableOpacity>
                      </View>
                  </View>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.addProductBtn} onPress={() => { setShowProductForm(true); setStep(1); }}>
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
  label: {
      color: '#fff',
      marginBottom: 10,
      fontWeight: '600'
  },
  categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 15,
      gap: 8,
  },
  categoryChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: '#222',
      borderWidth: 1,
      borderColor: '#333',
  },
  categoryChipSelected: {
      backgroundColor: '#fff',
      borderColor: '#fff',
  },
  categoryChipText: {
      color: '#888',
      fontSize: 14,
  },
  categoryChipTextSelected: {
      color: '#000',
      fontWeight: 'bold',
  },
  imagePreviewContainer: {
    marginRight: 10,
    width: 80,
    height: 80,
    position: 'relative',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 15,
      justifyContent: 'space-between',
  },
  categoryCard: {
      width: '47%',
      backgroundColor: '#222',
      borderRadius: 12,
      padding: 15,
      alignItems: 'center',
      marginBottom: 0,
      borderWidth: 1,
      borderColor: '#333',
  },
  categoryIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
  },
  categoryCardText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
  },
  formHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  selectedCategoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#222',
      padding: 10,
      borderRadius: 8,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#444',
  },
  dynamicFormSection: {
      marginTop: 10,
      marginBottom: 20,
      padding: 10,
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
  },
  sectionHeader: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  fieldLabel: {
      color: '#bbb',
      marginBottom: 5,
      fontSize: 12,
  },
  optionChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: '#333',
      borderRadius: 15,
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'transparent',
  },
  optionChipSelected: {
      backgroundColor: '#fff',
      borderColor: '#fff',
  },
  optionChipText: {
      color: '#bbb',
      fontSize: 12,
  },
  optionChipTextSelected: {
      fontWeight: 'bold',
  },
  addedGroupChip: {
      backgroundColor: '#222',
      padding: 8,
      borderRadius: 5,
      marginBottom: 5,
      borderLeftWidth: 3,
      borderLeftColor: '#fff',
  },
  addedGroupText: {
      color: '#aaa',
      fontSize: 12,
  },
  secondaryBtn: {
      padding: 10,
      backgroundColor: '#333',
      borderRadius: 5,
      alignItems: 'center',
      marginBottom: 10,
  },
  secondaryBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
  },
  variantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#222',
  },
  variantName: {
      color: '#ddd',
      flex: 2,
      fontSize: 14,
  },
  variantInput: {
      backgroundColor: '#111',
      color: '#fff',
      padding: 5,
      width: 60,
      borderRadius: 4,
      textAlign: 'center',
      marginLeft: 5,
      fontSize: 12,
  },
});
