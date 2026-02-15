import { useAlert } from '@/context/AlertContext';
import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Video as VideoCompressor } from 'react-native-compressor';
import Icon from 'react-native-vector-icons/Feather';

type ShopifyCategory = {
  id: string;
  name: string;
  full_name: string;
  level: number;
  parent_id: string | null;
  attributes: { name: string; handle: string; values: string[] }[];
};

type Product = {
  title: string;
  price: string;
  imageUris: string[];
  description: string;
  category: string;
  categoryId?: string;
  specifications?: Record<string, any>;
  hasVariants?: boolean;
  variants?: { name: string; options: string[] }[];
  generatedVariants?: { id: string; name: string; price: string; stock: string; options?: any }[];
  media?: { uri: string; type: 'image' | 'video'; variantTag: string | null }[];
};

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 90; // 1.5 minutes
const MIN_COMPRESS_SIZE_MB = 5;
const { width } = Dimensions.get('window');

export default function UploadScreen() {
  const { profile } = useUserStore();
  const { showAlert } = useAlert();
  const [currentStep, setCurrentStep] = useState(0); // 0: Video, 1: Products

  const [uploading, setUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Category Selection State
  const [categoryPath, setCategoryPath] = useState<ShopifyCategory[]>([]);
  const [currentCategories, setCurrentCategories] = useState<ShopifyCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Form State
  const [tempProduct, setTempProduct] = useState<Product>({ title: '', price: '', imageUris: [], description: '', category: '', specifications: {}, variants: [], generatedVariants: [], media: [] });
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantValues, setNewVariantValues] = useState('');
  const [currentVariantTags, setCurrentVariantTags] = useState<string[]>([]);
  
  // Suggested Options
  const [suggestedAttributes, setSuggestedAttributes] = useState<string[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShopifyCategory[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchCategories(null);
  }, []);

  const fetchCategories = async (parentId: string | null) => {
    setLoadingCategories(true);
    let query = supabase.from('shopify_categories').select('*').order('name');
    
    if (parentId) {
        query = query.eq('parent_id', parentId);
    } else {
        query = query.is('parent_id', null);
    }

    const { data } = await query;
    if (data) {
        setCurrentCategories(data);
    }
    setLoadingCategories(false);
  };

  const searchCategories = async (query: string) => {
      if (!query.trim()) {
          setSearchResults([]);
          setIsSearching(false);
          return;
      }
      setIsSearching(true);
      const { data } = await supabase
          .from('shopify_categories')
          .select('*')
          .ilike('full_name', `%${query}%`)
          .limit(20);
      
      if (data) {
          setSearchResults(data);
      }
      setIsSearching(false);
  };

  const handleCategorySelect = async (category: ShopifyCategory) => {
    const newPath = [...categoryPath, category];
    setCategoryPath(newPath);

    setLoadingCategories(true);
    const { data: children } = await supabase
        .from('shopify_categories')
        .select('*')
        .eq('parent_id', category.id)
        .order('name');
    setLoadingCategories(false);

    if (children && children.length > 0) {
        setCurrentCategories(children);
    } else {
        setTempProduct({ 
            ...tempProduct, 
            category: category.full_name,
            categoryId: category.id
        });
        
        if (category.attributes) {
            const attrNames = category.attributes.map(a => a.name);
            setSuggestedAttributes(attrNames);
        }
    }
  };

  const handleBackCategory = () => {
      if (categoryPath.length === 0) return;
      
      const newPath = [...categoryPath];
      newPath.pop();
      setCategoryPath(newPath);

      const lastItem = newPath.length > 0 ? newPath[newPath.length - 1] : null;
      if (lastItem) {
          fetchCategories(lastItem.id);
      } else {
          fetchCategories(null);
      }
      
      if (tempProduct.category) {
          setTempProduct({ ...tempProduct, category: '', categoryId: undefined });
      }
  };

  const resetForm = () => {
       setShowProductModal(false);
       setTempProduct({ title: '', price: '', imageUris: [], description: '', category: '', specifications: {}, variants: [], generatedVariants: [], media: [] });
       setCategoryPath([]);
       fetchCategories(null);
       setNewVariantName('');
       setNewVariantValues('');
       setCurrentVariantTags([]);
       setSuggestedAttributes([]);
       setSearchQuery('');
       setSearchResults([]);
  };

  const getColorVariantGroup = () => {
      if (!tempProduct.variants) return null;
      return tempProduct.variants.find(v => v.name.toLowerCase() === 'color' || v.name.toLowerCase() === 'colour');
  };

  const pickMediaForVariant = async (variantTag: string | null) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newMedia = { uri: result.assets[0].uri, type: 'image' as const, variantTag };
      setTempProduct(prev => ({ 
          ...prev, 
          imageUris: [...prev.imageUris, result.assets[0].uri],
          media: [...(prev.media || []), newMedia]
      }));
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.duration && asset.duration > MAX_VIDEO_DURATION * 1000) {
        showAlert('error', `Please select a video under ${MAX_VIDEO_DURATION} seconds.`);
        return;
      }
      const fileSize = asset.fileSize || 0;
      if (fileSize > MAX_VIDEO_SIZE) {
        showAlert('error', `Please select a video under ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`);
        return;
      }

      if (fileSize > MIN_COMPRESS_SIZE_MB * 1024 * 1024) {
          setIsCompressing(true);
          setVideo(asset);
          try {
              const compressedUri = await VideoCompressor.compress(asset.uri, {
                  compressionMethod: 'manual',
                  bitrate: 1500000, 
              });
              const compressedInfo = await FileSystem.getInfoAsync(compressedUri);
              if (compressedInfo.exists) {
                  setVideo({ ...asset, uri: compressedUri, fileSize: compressedInfo.size });
              }
          } catch (error) {
              console.error('Compression failed:', error);
          } finally {
              setIsCompressing(false);
          }
      } else {
          setVideo(asset);
      }
    }
  };

  const addProduct = () => {
    if (!tempProduct.title || !tempProduct.price || tempProduct.imageUris.length === 0 || !tempProduct.category) {
      showAlert('error', 'Please fill all fields, select at least one image, and choose a category');
      return;
    }
    setProducts([...products, tempProduct]);
    resetForm();
  };

  const addVariantOption = () => {
      if (!newVariantName || currentVariantTags.length === 0) return;
      const options = [...currentVariantTags];
      
      const newGroup = { name: newVariantName, options };
      const updatedVariants = [...(tempProduct.variants || []), newGroup];

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
      setCurrentVariantTags([]);
  };

  const uploadFile = async (uri: string, bucket: string, folder: string) => {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${folder}/${Date.now()}.${ext}`;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    let publicUrl = '';

    if (bucket === 'videos') {
         const { data, error } = await supabase.functions.invoke('upload-r2-url', {
             body: { filename: `${Date.now()}_${ext}`, contentType: 'video/mp4' }
         });
         if (error || !data?.uploadUrl) throw new Error('Failed to get video upload URL');
         
         const uploadResponse = await FileSystem.uploadAsync(data.uploadUrl, uri, {
             httpMethod: 'PUT',
             uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
             headers: { 'Content-Type': 'video/mp4' },
         });
         if (uploadResponse.status !== 200) throw new Error(`R2 Upload failed`);
         publicUrl = data.publicUrl;
    } else {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
        const response = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { Authorization: `Bearer ${session.access_token}`, apikey: supabaseAnonKey, 'Content-Type': 'image/jpeg' },
        });
        if (response.status !== 200) throw new Error(`Upload failed`);
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = publicData.publicUrl;
    }
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!video) { showAlert('error', 'Please select a video'); return; }
    if (products.length === 0) { showAlert('error', 'Please add at least one product'); return; }
    if (!profile) { showAlert('error', 'User profile not found. Please log in again.'); return; }

    try {
      setUploading(true);
      const videoUrl = await uploadFile(video.uri, 'videos', profile.id);
      const { data: videoData, error: videoError } = await supabase.from('videos').insert({
          seller_id: profile.id, video_url: videoUrl, description: caption,
        }).select().single();
      if (videoError) throw videoError;

      for (const prod of products) {
        const mediaUploads = [];
        if (prod.media && prod.media.length > 0) {
            for (const m of prod.media) {
                const url = await uploadFile(m.uri, 'product-images', profile.id);
                mediaUploads.push({ ...m, finalUrl: url });
            }
        } else if (prod.imageUris.length > 0) {
             for (const uri of prod.imageUris) {
                const url = await uploadFile(uri, 'product-images', profile.id);
                mediaUploads.push({ uri, type: 'image', variantTag: null, finalUrl: url });
            }
        }

        const mainImageUrl = mediaUploads.length > 0 ? mediaUploads[0].finalUrl : null;
        
        const { data: productData, error: productError } = await supabase.from('products').insert({
            seller_id: profile.id,
            title: prod.title,
            price: parseFloat(prod.price),
            description: prod.description,
            image_url: mainImageUrl, // Legacy / Main
            images: mediaUploads.map(m => m.finalUrl), // Legacy Array
            category: prod.category, 
            specifications: prod.specifications || {},
            vendor: profile.username || 'SwipeKart',
            status: 'active' 
          }).select().single();
        if (productError) throw productError;

        if (mediaUploads.length > 0) {
            const mediaInserts = mediaUploads.map((m, index) => ({
                product_id: productData.id,
                url: m.finalUrl,
                type: m.type || 'image',
                alt: prod.title,
                position: index,
                variant_group_name: m.variantTag ? 'Color' : null,
                variant_group_value: m.variantTag
            }));
            const { error: mediaError } = await supabase.from('product_media').insert(mediaInserts);
            if (mediaError) throw mediaError;
        }

        if (prod.generatedVariants && prod.generatedVariants.length > 0) {
            const variantsToInsert = prod.generatedVariants.map(v => ({
                product_id: productData.id,
                variant_name: v.name,
                price: parseFloat(v.price) || parseFloat(prod.price),
                stock_quantity: parseInt(v.stock) || 0,
                sku: `${productData.id}-${v.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
                variant_options: v.options
            }));
            await supabase.from('product_variants').insert(variantsToInsert);
        }
        await supabase.from('video_products').insert({ video_id: videoData.id, product_id: productData.id });
      }
      showAlert('success', 'Video uploaded successfully!');
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (error: any) {
      showAlert('error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleNextStep = () => {
      if (currentStep === 0) {
          if (!video) {
              showAlert('error', 'Please select a video first.');
              return;
          }
          if (!caption) {
              showAlert('error', 'Please add a caption.');
              return;
          }
          setCurrentStep(1);
      }
  };

  const handlePrevStep = () => {
      if (currentStep === 1) {
          setCurrentStep(0);
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload</Text>
          <View style={{ width: 40 }} />
      </View>

      {/* Stepper Progress */}
      <View style={styles.stepperContainer}>
          <View style={[styles.stepItem, currentStep >= 0 && styles.stepActive]}>
              <View style={[styles.stepCircle, currentStep >= 0 && styles.stepCircleActive]}>
                  <Text style={[styles.stepText, currentStep >= 0 && styles.stepTextActive]}>1</Text>
              </View>
              <Text style={styles.stepLabel}>Video</Text>
          </View>
          <View style={[styles.stepLine, currentStep >= 1 && styles.stepLineActive]} />
          <View style={[styles.stepItem, currentStep >= 1 && styles.stepActive]}>
              <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
                  <Text style={[styles.stepText, currentStep >= 1 && styles.stepTextActive]}>2</Text>
              </View>
              <Text style={styles.stepLabel}>Products</Text>
          </View>
      </View>

      <View style={styles.contentContainer}>
        {/* STEP 1: VIDEO UPLOAD */}
        {currentStep === 0 && (
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.stepTitle}>Add your video</Text>
                <Text style={styles.stepSubtitle}>Upload a short video demonstrating your products.</Text>

                <TouchableOpacity style={styles.videoUploadBox} onPress={pickVideo}>
                    {video ? (
                        <View style={styles.videoPreviewContainer}>
                            <Image source={{ uri: video.uri }} style={[styles.videoPreview, isCompressing && { opacity: 0.5 }]} resizeMode="cover" />
                            {isCompressing && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                    <Text style={{ color: '#fff', marginTop: 10 }}>Compressing...</Text>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <Icon name="edit-2" size={16} color="#fff" />
                            </View>
                        </View>
                    ) : (
                        <>
                            <View style={styles.uploadIconCircle}>
                                <Icon name="upload-cloud" size={32} color="#666" />
                            </View>
                            <Text style={{ color: '#000', fontWeight: '600', marginTop: 10 }}>Select Video</Text>
                            <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Max 90 seconds, 50MB</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Caption</Text>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="Write a catchy caption about your video..."
                        placeholderTextColor="#999"
                        multiline
                        value={caption}
                        onChangeText={setCaption}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep}>
                    <Text style={styles.primaryBtnText}>Next Step</Text>
                    <Icon name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </ScrollView>
        )}

        {/* STEP 2: PRODUCTS */}
        {currentStep === 1 && (
            <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.stepTitle}>Tag Products</Text>
                    <Text style={styles.stepSubtitle}>Add products featured in this video.</Text>

                    {products.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Icon name="shopping-bag" size={48} color="#ddd" />
                            <Text style={{ color: '#888', marginTop: 10 }}>No products added yet.</Text>
                        </View>
                    ) : (
                        products.map((p, i) => (
                            <View key={i} style={styles.productCard}>
                                <Image source={{ uri: p.imageUris[0] }} style={styles.productThumb} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.productTitle}>{p.title}</Text>
                                    <Text style={styles.productPrice}>${p.price}</Text>
                                    <Text style={styles.productCategory}>{p.category}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setProducts(products.filter((_, idx) => idx !== i))} style={styles.deleteBtn}>
                                    <Icon name="trash-2" size={18} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    <TouchableOpacity style={styles.addMoreBtn} onPress={() => setShowProductModal(true)}>
                        <Icon name="plus" size={20} color="#000" />
                        <Text style={styles.addMoreText}>Add Product</Text>
                    </TouchableOpacity>

                </ScrollView>

                <View style={styles.footerActions}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrevStep}>
                        <Text style={styles.secondaryBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 10 }, (uploading || products.length === 0) && { opacity: 0.6 }]} onPress={handleSubmit} disabled={uploading || products.length === 0}>
                        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Post Video</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        )}
      </View>

      {/* Add Product Modal */}
      <Modal visible={showProductModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={resetForm}><Text style={{ color: '#666', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Add Product</Text>
                <TouchableOpacity onPress={addProduct}><Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>Done</Text></TouchableOpacity>
            </View>
            
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                     {/* Category Select */}
                     <View style={styles.modalSection}>
                        <Text style={styles.modalLabel}>Category</Text>
                        <View style={styles.categoryPicker}>
                            {categoryPath.length > 0 && !tempProduct.categoryId && (
                                <TouchableOpacity onPress={handleBackCategory} style={{ padding: 5, marginRight: 5 }}>
                                     <Icon name="arrow-left" size={20} color="#000" />
                                </TouchableOpacity>
                            )}
                            {tempProduct.category ? (
                                <TouchableOpacity onPress={() => setTempProduct({ ...tempProduct, category: '', categoryId: undefined })} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Text style={{ flex: 1, fontWeight: '600', fontSize: 16 }}>{tempProduct.category}</Text>
                                    <Icon name="edit-2" size={16} color="#666" />
                                </TouchableOpacity>
                            ) : (
                                <View style={{ flex: 1 }}>
                                    <View style={styles.searchBarContainer}>
                                        <Icon name="search" size={20} color="#999" style={{ marginRight: 8 }} />
                                        <TextInput 
                                            style={styles.searchBarInput}
                                            placeholder="Search Categories (e.g. Shoes)"
                                            placeholderTextColor="#999"
                                            value={searchQuery}
                                            onChangeText={(t) => { setSearchQuery(t); searchCategories(t); }}
                                        />
                                        {searchQuery.length > 0 && (
                                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                                                <Icon name="x-circle" size={16} color="#999" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={{ maxHeight: 200, marginTop: 10 }}>
                                        <ScrollView nestedScrollEnabled>
                                            {searchQuery.length > 0 ? (
                                                 searchResults.map(cat => (
                                                     <TouchableOpacity key={cat.id} style={styles.catItem} onPress={() => { handleCategorySelect(cat); setSearchQuery(''); }}>
                                                         <Text>{cat.full_name}</Text>
                                                     </TouchableOpacity>
                                                 ))
                                            ) : (
                                                currentCategories.map(cat => (
                                                    <TouchableOpacity key={cat.id} style={styles.catItem} onPress={() => handleCategorySelect(cat)}>
                                                        <Text style={{ fontSize: 16 }}>{cat.name}</Text>
                                                        <Icon name="chevron-right" size={18} color="#ccc" />
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                        </View>
                     </View>

                     {/* Only show rest of form if Category is selected (or at least, encourage it) */}
                     {tempProduct.categoryId && (
                         <>
                             <View style={styles.modalSection}>
                                 <Text style={styles.modalLabel}>Details</Text>
                                 <TextInput style={styles.modalInput} placeholder="Product Title" value={tempProduct.title} onChangeText={t => setTempProduct({...tempProduct, title: t})} />
                                 <TextInput style={styles.modalInput} placeholder="Price ($)" keyboardType="numeric" value={tempProduct.price} onChangeText={t => setTempProduct({...tempProduct, price: t})} />
                                 <TextInput style={[styles.modalInput, { minHeight: 80 }]} placeholder="Description" multiline value={tempProduct.description} onChangeText={t => setTempProduct({...tempProduct, description: t})} textAlignVertical="top" />
                             </View>

                             <View style={styles.modalSection}>
                                 <Text style={styles.modalLabel}>Images</Text>
                                 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <TouchableOpacity style={styles.modalImageAdd} onPress={() => pickMediaForVariant(null)}>
                                        <Icon name="plus" size={24} color="#007AFF" />
                                    </TouchableOpacity>
                                    {(tempProduct.media || []).filter(m => m.variantTag === null).map((m, idx) => (
                                        <Image key={idx} source={{ uri: m.uri }} style={styles.modalImageThumb} />
                                    ))}
                                 </ScrollView>
                             </View>
                            
                             {/* Variants */}
                             <View style={styles.modalSection}>
                                 <Text style={styles.modalLabel}>Variants</Text>
                                 <TextInput style={styles.modalInput} placeholder="Option Name (e.g. Size, Color)" value={newVariantName} onChangeText={setNewVariantName} />
                                 <View style={{ flexDirection: 'row', gap: 10 }}>
                                     <TextInput 
                                        style={[styles.modalInput, { flex: 1 }]} 
                                        placeholder="Values (e.g. S, M)" 
                                        value={newVariantValues} 
                                        onChangeText={setNewVariantValues} 
                                        onSubmitEditing={() => { if (newVariantValues.trim()) { setCurrentVariantTags([...currentVariantTags, newVariantValues.trim()]); setNewVariantValues(''); } }}
                                     />
                                     <TouchableOpacity style={styles.smallBtn} onPress={() => { if (newVariantValues.trim()) { setCurrentVariantTags([...currentVariantTags, newVariantValues.trim()]); setNewVariantValues(''); } }}>
                                         <Icon name="plus" size={20} color="#fff" />
                                     </TouchableOpacity>
                                 </View>
                                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                                     {currentVariantTags.map((t, i) => (
                                         <View key={i} style={styles.chipLight}><Text>{t}</Text></View>
                                     ))}
                                 </View>
                                 <TouchableOpacity style={styles.textBtn} onPress={addVariantOption} disabled={!newVariantName || currentVariantTags.length === 0}>
                                     <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>+ Add Variant Group</Text>
                                 </TouchableOpacity>

                                 {/* Generated Variants Preview */}
                                 {tempProduct.generatedVariants && tempProduct.generatedVariants.length > 0 && (
                                     <View style={{ marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                                         <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Generated Variants:</Text>
                                         {tempProduct.generatedVariants.map((v, i) => (
                                             <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                 <Text style={{ fontSize: 13 }}>{v.name}</Text>
                                                 <Text style={{ fontSize: 13, fontWeight: '600' }}>${v.price}</Text>
                                             </View>
                                         ))}
                                     </View>
                                 )}
                             </View>
                             
                             {/* Color Specific Images if applicable */}
                             {getColorVariantGroup()?.options.map((opt) => (
                                <View key={opt} style={styles.modalSection}>
                                    <Text style={styles.modalLabel}>{opt} Images</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <TouchableOpacity style={styles.modalImageAdd} onPress={() => pickMediaForVariant(opt)}>
                                            <Icon name="camera" size={20} color="#666" />
                                        </TouchableOpacity>
                                        {(tempProduct.media || []).filter(m => m.variantTag === opt).map((m, idx) => (
                                            <Image key={idx} source={{ uri: m.uri }} style={styles.modalImageThumb} />
                                        ))}
                                    </ScrollView>
                                </View>
                             ))}

                             <View style={{ height: 100 }} />
                         </>
                     )}
                </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  
  // Stepper
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  stepItem: { flexDirection: 'row', alignItems: 'center', opacity: 0.3 },
  stepActive: { opacity: 1 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  stepCircleActive: { backgroundColor: '#000' },
  stepText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  stepTextActive: { color: '#fff' },
  stepLabel: { fontSize: 14, fontWeight: '600', color: '#000' },
  stepLine: { width: 40, height: 2, backgroundColor: '#eee', marginHorizontal: 10 },
  stepLineActive: { backgroundColor: '#000' },

  contentContainer: { flex: 1 },
  scrollContent: { padding: 20 },
  stepTitle: { fontSize: 24, fontWeight: '800', marginBottom: 5, color: '#000' },
  stepSubtitle: { fontSize: 16, color: '#666', marginBottom: 20 },

  // Video Upload Step
  videoUploadBox: { 
      height: 250, 
      backgroundColor: '#F8F9FA', 
      borderRadius: 16, 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderWidth: 2, 
      borderColor: '#eee', 
      borderStyle: 'dashed',
      marginBottom: 20 
  },
  videoPreviewContainer: { width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden' },
  videoPreview: { width: '100%', height: '100%' },
  uploadIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 20 },
  
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  captionInput: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 15, fontSize: 16, minHeight: 100, color: '#000' },

  // Products Step
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, borderWidth: 1, borderColor: '#eee', borderRadius: 16, borderStyle: 'dashed' },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  productThumb: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  productPrice: { fontSize: 14, color: '#666' },
  productCategory: { fontSize: 12, color: '#999', marginTop: 2 },
  deleteBtn: { padding: 8 },

  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: '#000', borderRadius: 12, marginTop: 10, borderStyle: 'dashed' },
  addMoreText: { marginLeft: 8, fontWeight: 'bold' },

  footerActions: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
  primaryBtn: { backgroundColor: '#000', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#f0f0f0', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalSection: { marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  modalInput: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 10 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  searchBarInput: { flex: 1, fontSize: 16, color: '#000', paddingVertical: 4 },
  categoryPicker: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8, minHeight: 50 },
  catItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  modalImageAdd: { width: 70, height: 70, backgroundColor: '#F0F8FF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#007AFF' },
  modalImageThumb: { width: 70, height: 70, borderRadius: 8, marginRight: 10, backgroundColor: '#eee' },
  smallBtn: { backgroundColor: '#000', width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  textBtn: { paddingVertical: 8 },
  chipLight: { backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
});
