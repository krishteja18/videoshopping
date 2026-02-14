
import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  media?: { uri: string; type: 'image' | 'video'; variantTag: string | null }[]; // Added for Phase 3
};

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 90; // 1.5 minutes
const MIN_COMPRESS_SIZE_MB = 5;

export default function UploadScreen() {
  const { profile } = useUserStore();
  const [uploading, setUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  
  // Category Selection State
  const [categoryPath, setCategoryPath] = useState<ShopifyCategory[]>([]);
  const [currentCategories, setCurrentCategories] = useState<ShopifyCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Form State
  const [tempProduct, setTempProduct] = useState<Product>({ title: '', price: '', imageUris: [], description: '', category: '', specifications: {}, variants: [], generatedVariants: [], media: [] });
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantValues, setNewVariantValues] = useState('');
  const [currentVariantTags, setCurrentVariantTags] = useState<string[]>([]);
  
  // Suggested Options from Taxonomy (e.g. Size, Color)
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
    // 1. Add to path
    const newPath = [...categoryPath, category];
    setCategoryPath(newPath);

    // 2. Check for children
    setLoadingCategories(true);
    const { data: children } = await supabase
        .from('shopify_categories')
        .select('*')
        .eq('parent_id', category.id)
        .order('name');
    setLoadingCategories(false);

    if (children && children.length > 0) {
        // Has children, drill down
        setCurrentCategories(children);
    } else {
        // Leaf node, select it
        setTempProduct({ 
            ...tempProduct, 
            category: category.full_name, // e.g. "Apparel > Shirts > T-Shirts"
            categoryId: category.id
        });
        
        // Extract attribute names for suggestions
        if (category.attributes) {
            const attrNames = category.attributes.map(a => a.name);
            setSuggestedAttributes(attrNames);
            
            // Also populate variants logic if there are distinct variant attributes
            // For now just storing suggestions to show in UI
        }
    }
  };

  const handleBackCategory = () => {
      if (categoryPath.length === 0) return;
      
      const newPath = [...categoryPath];
      newPath.pop(); // Remove last
      setCategoryPath(newPath);

      // Fetch siblings of the new last item, or root if empty
      const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : null;
      
      // We actually need to fetch children of the *parent* of the item we just popped.
      // E.g. Path: [A, B]. We are looking at C's children.
      // Pop B. Path: [A]. We want to see A's children (which include B).
      
      // Wait, logically:
      // Path = [Apparel]. Showing: Clothing, Shoes.
      // User clicks Clothing. Path = [Apparel, Clothing]. Showing: Shirts, Pants.
      // User clicks Back. Path = [Apparel]. Should show: Clothing, Shoes (Children of Apparel).
      
      const lastItem = newPath.length > 0 ? newPath[newPath.length - 1] : null;
      // If lastItem is null, we are at root.
      // If lastItem is A, we want children of A. (to allow re-selecting B)
      
      // NOTE: parentId logic in my fetchCategories takes parent of what we want to SHOW.
      // If we want to show children of A, parentId = A.id.
      
      if (lastItem) {
          fetchCategories(lastItem.id); // Get children of last remaining item
      } else {
          fetchCategories(null); // Get root
      }
      
      // If we had a selected product category (leaf), clear it
      if (tempProduct.category) {
          setTempProduct({ ...tempProduct, category: '', categoryId: undefined });
      }
  };

  const resetForm = () => {
       setShowProductForm(false);
       setTempProduct({ title: '', price: '', imageUris: [], description: '', category: '', specifications: {}, variants: [], generatedVariants: [] });
       setCategoryPath([]);
       fetchCategories(null);
       setNewVariantName('');
       setNewVariantValues('');
       setCurrentVariantTags([]);
       setCurrentVariantTags([]);
       setCurrentVariantTags([]);
       setSuggestedAttributes([]);
       setSearchQuery('');
       setSearchResults([]);
  };

  const getColorVariantGroup = () => {
      // Find the variant group that represents "Color"
      if (!tempProduct.variants) return null;
      return tempProduct.variants.find(v => v.name.toLowerCase() === 'color' || v.name.toLowerCase() === 'colour');
  };

  const pickMediaForVariant = async (variantTag: string | null) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only images for now
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newMedia = { uri: result.assets[0].uri, type: 'image' as const, variantTag };
      setTempProduct(prev => ({ 
          ...prev, 
          imageUris: [...prev.imageUris, result.assets[0].uri], // Keep legacy for thumbnail compatibility
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
        Alert.alert('Video too long', `Please select a video under ${MAX_VIDEO_DURATION} seconds.`);
        return;
      }
      const fileSize = asset.fileSize || 0;
      if (fileSize > MAX_VIDEO_SIZE) {
        Alert.alert('File too large', `Please select a video under ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`);
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

  /* Deprecated single picker
  const pickProductImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setTempProduct({ ...tempProduct, imageUris: [...tempProduct.imageUris, result.assets[0].uri] });
    }
  }; */


  const addProduct = () => {
    if (!tempProduct.title || !tempProduct.price || tempProduct.imageUris.length === 0 || !tempProduct.category) {
      Alert.alert('Error', 'Please fill all fields, select at least one image, and choose a category');
      return;
    }
    setProducts([...products, tempProduct]);
    resetForm();
  };

  // Add Variant Option Group
  const addVariantOption = () => {
      if (!newVariantName || currentVariantTags.length === 0) return;
      const options = [...currentVariantTags];
      
      const newGroup = { name: newVariantName, options };
      const updatedVariants = [...(tempProduct.variants || []), newGroup];

      // Generates permutations
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
  
  // Re-use existing uploadFile and handleSubmit (omitted/collapsed for brevity if valid, but I must write full file)
  // ... copying logic
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
    if (!video) { Alert.alert('Error', 'Please select a video'); return; }
    if (products.length === 0) { Alert.alert('Error', 'Please add at least one product'); return; }
    if (!profile) { Alert.alert('Error', 'User profile not found. Please log in again.'); return; }

    try {
      setUploading(true);
      const videoUrl = await uploadFile(video.uri, 'videos', profile.id);
      const { data: videoData, error: videoError } = await supabase.from('videos').insert({
          seller_id: profile.id, video_url: videoUrl, description: caption,
        }).select().single();
      if (videoError) throw videoError;

      for (const prod of products) {
        // Upload all media files
        const mediaUploads = [];
        if (prod.media && prod.media.length > 0) {
            for (const m of prod.media) {
                const url = await uploadFile(m.uri, 'product-images', profile.id);
                mediaUploads.push({ ...m, finalUrl: url });
            }
        } else if (prod.imageUris.length > 0) {
            // Fallback for legacy / if no media structure
             for (const uri of prod.imageUris) {
                const url = await uploadFile(uri, 'product-images', profile.id);
                mediaUploads.push({ uri, type: 'image', variantTag: null, finalUrl: url });
            }
        }

        // Determine main image (first one)
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
            // New fields
            vendor: profile.username || 'SwipeKart',
            status: 'active' 
          }).select().single();
        if (productError) throw productError;

        // Insert into product_media
        if (mediaUploads.length > 0) {
            const mediaInserts = mediaUploads.map((m, index) => ({
                product_id: productData.id,
                url: m.finalUrl,
                type: m.type || 'image',
                alt: prod.title,
                position: index,
                variant_group_name: m.variantTag ? 'Color' : null, // Hardcoding 'Color' as the group for now
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
      Alert.alert('Success', 'Video uploaded successfully!', [{ text: 'OK', onPress: () => router.back() }]);
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
        {/* Video Section - Collapsible or small preview if products added? For now keep same. */}
        <TouchableOpacity style={styles.videoPlaceholder} onPress={pickVideo}>
          {video ? (
            <View style={styles.videoSelected}>
                <Image source={{ uri: video.uri }} style={[styles.videoPreview, isCompressing && { opacity: 0.5 }]} resizeMode="cover" /> 
                {isCompressing && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                )}
                {!isCompressing && <View style={styles.changeOverlay}><Icon name="edit-2" size={24} color="#fff" /></View>}
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

        <Text style={styles.sectionTitle}>Products ({products.length})</Text>
        {products.map((p, i) => (
          <View key={i} style={styles.productCard}>
            <Image source={{ uri: p.imageUris[0] }} style={styles.productThumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle}>{p.title}</Text>
              <Text style={styles.productPrice} numberOfLines={1}>{p.category}</Text>
            </View>
            <TouchableOpacity onPress={() => setProducts(products.filter((_, idx) => idx !== i))}>
                <Icon name="x" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        ))}

        {showProductForm ? (
            <View style={styles.formCard}>
                {/* Header / Breadcrumb */}
                <View style={styles.formHeader}>
                    {categoryPath.length > 0 && !tempProduct.categoryId && (
                        <TouchableOpacity onPress={handleBackCategory} style={{ padding: 5 }}>
                             <Icon name="arrow-left" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 10 }}>
                        {categoryPath.length === 0 ? (
                            <Text style={styles.formTitle}>Select Category</Text>
                        ) : (
                            <Text style={[styles.formTitle, { fontSize: 14, color: '#aaa' }]}>
                                {categoryPath.map(c => c.name).join(' > ')}
                            </Text>
                        )}
                    </ScrollView>
                </View>

                {!tempProduct.categoryId ? (
                    // CATEGORY PICKER
                    <View style={{ minHeight: 300 }}>
                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <Icon name="search" size={20} color="#666" style={{ marginRight: 10 }} />
                            <TextInput 
                                style={styles.searchInput}
                                placeholder="Search categories (e.g. Shirts, Shoes)"
                                placeholderTextColor="#666"
                                value={searchQuery}
                                onChangeText={(t) => {
                                    setSearchQuery(t);
                                    searchCategories(t);
                                }}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                                    <Icon name="x" size={18} color="#666" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {loadingCategories || isSearching ? (
                            <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
                        ) : (
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 400 }}>
                                {/* Show Search Results if query exists */}
                                {searchQuery.length > 0 ? (
                                    searchResults.length > 0 ? (
                                        searchResults.map(cat => (
                                            <TouchableOpacity 
                                                key={cat.id} 
                                                style={styles.categoryListItem}
                                                onPress={() => {
                                                    // When selecting from search, we treat it as a leaf selection
                                                    // But we should probably check if it has children? 
                                                    // For now, let's just select it as the category.
                                                    // Ideally, if it's not a leaf, we might want to drill down?
                                                    // User request: "they can search category/subcategory/leaf, anything"
                                                    // If they select "Apparel", do they mean the folder or the item?
                                                    // Let's assume selection means "I want this specific category". 
                                                    // But strictly, only leaves should be selectable for products usually.
                                                    // Let's check if leaf logic is better.
                                                    // For simplicity, let's treat any selection here as "drilling down" if it has children,
                                                    // OR selecting if it's a leaf.
                                                    // Actually, let's just use handleCategorySelect which handles drilling!
                                                    handleCategorySelect(cat);
                                                    setSearchQuery(''); // Clear search to show the view
                                                }}
                                            >
                                                <View>
                                                    <Text style={styles.categoryListText}>{cat.name}</Text>
                                                    <Text style={{ color: '#666', fontSize: 12 }}>{cat.full_name}</Text>
                                                </View>
                                                <Icon name="chevron-right" size={20} color="#666" />
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>No results found.</Text>
                                    )
                                ) : (
                                    /* Normal Browse List */
                                    <>
                                        {currentCategories.map(cat => (
                                            <TouchableOpacity 
                                                key={cat.id} 
                                                style={styles.categoryListItem}
                                                onPress={() => handleCategorySelect(cat)}
                                            >
                                                <Text style={styles.categoryListText}>{cat.name}</Text>
                                                <Icon name="chevron-right" size={20} color="#666" />
                                            </TouchableOpacity>
                                        ))}
                                        {currentCategories.length === 0 && !loadingCategories && (
                                            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>No categories found.</Text>
                                        )}
                                    </>
                                )}
                            </ScrollView>
                        )}
                    </View>
                ) : (
                    // PRODUCT DETAILS FORM (Leaf Category Selected)
                    <View>
                        {/* Updated Media Section with Variant Grouping */}
                        <View style={styles.dynamicFormSection}>
                            <Text style={styles.sectionHeader}>Media</Text>
                            
                            {/* General Media (No specific variant) */}
                            <View style={{ marginBottom: 15 }}>
                                <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>General / Main Images</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <TouchableOpacity style={styles.imagePicker} onPress={() => pickMediaForVariant(null)}>
                                        <Icon name="camera" size={24} color="#666" />
                                        <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>Add</Text>
                                    </TouchableOpacity>
                                    {(tempProduct.media || []).filter(m => m.variantTag === null).map((m, idx) => (
                                        <View key={idx} style={styles.imagePreviewContainer}>
                                            <Image source={{ uri: m.uri }} style={styles.imagePreview} />
                                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => {
                                                const newMedia = (tempProduct.media || []).filter(item => item !== m);
                                                setTempProduct({ ...tempProduct, media: newMedia });
                                            }}>
                                                <Icon name="x" size={12} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Color Specific Media */}
                            {getColorVariantGroup()?.options.map((opt) => (
                                <View key={opt} style={{ marginBottom: 15 }}>
                                    <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>{opt} Images</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <TouchableOpacity style={[styles.imagePicker, { borderColor: '#444' }]} onPress={() => pickMediaForVariant(opt)}>
                                            <Icon name="camera" size={24} color="#666" />
                                            <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>Add</Text>
                                        </TouchableOpacity>
                                        {(tempProduct.media || []).filter(m => m.variantTag === opt).map((m, idx) => (
                                            <View key={idx} style={styles.imagePreviewContainer}>
                                                <Image source={{ uri: m.uri }} style={styles.imagePreview} />
                                                <TouchableOpacity style={styles.removeImageBtn} onPress={() => {
                                                    const newMedia = (tempProduct.media || []).filter(item => item !== m);
                                                    setTempProduct({ ...tempProduct, media: newMedia });
                                                }}>
                                                    <Icon name="x" size={12} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            ))}
                        </View>

                        <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#666" value={tempProduct.title} onChangeText={t => setTempProduct({...tempProduct, title: t})} />
                        <TextInput style={styles.input} placeholder="Price" placeholderTextColor="#666" keyboardType="numeric" value={tempProduct.price} onChangeText={t => setTempProduct({...tempProduct, price: t})} />
                        <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#666" multiline value={tempProduct.description} onChangeText={t => setTempProduct({...tempProduct, description: t})} />

                        {/* Attribute Suggestions */}
                        {suggestedAttributes.length > 0 && (
                            <View style={styles.dynamicFormSection}>
                                <Text style={styles.sectionHeader}>Suggested Attributes</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {suggestedAttributes.map(attr => (
                                        <View key={attr} style={styles.attributeTag}>
                                            <Icon name="tag" size={12} color="#888" style={{ marginRight: 4 }} />
                                            <Text style={{ color: '#ccc', fontSize: 12 }}>{attr}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Variants Section */}
                        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Variants</Text>
                        <View style={{ gap: 10 }}>
                             <TextInput style={styles.input} placeholder="Option Name (e.g. Size)" placeholderTextColor="#666" value={newVariantName} onChangeText={setNewVariantName} />
                             {/* Show quick picks for Option Name from suggested attributes? */}
                             {suggestedAttributes.length > 0 && (
                                 <ScrollView horizontal style={{ marginBottom: 10 }} showsHorizontalScrollIndicator={false}>
                                     {suggestedAttributes.map(attr => (
                                         <TouchableOpacity key={attr} onPress={() => setNewVariantName(attr)} style={styles.optionChip}>
                                             <Text style={styles.optionChipText}>{attr}</Text>
                                         </TouchableOpacity>
                                     ))}
                                 </ScrollView>
                             )}

                             <View style={styles.chipsInputContainer}>
                                <TextInput 
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                                    placeholder="Value (e.g. S, M)" 
                                    placeholderTextColor="#666"
                                    value={newVariantValues} 
                                    onChangeText={setNewVariantValues}
                                    onSubmitEditing={() => { if (newVariantValues.trim()) { setCurrentVariantTags([...currentVariantTags, newVariantValues.trim()]); setNewVariantValues(''); } }}
                                />
                                <TouchableOpacity style={styles.addChipBtn} onPress={() => { if (newVariantValues.trim()) { setCurrentVariantTags([...currentVariantTags, newVariantValues.trim()]); setNewVariantValues(''); } }}>
                                    <Icon name="plus" size={20} color="#000" />
                                </TouchableOpacity>
                             </View>
                             
                             <View style={styles.chipsContainer}>
                                  {currentVariantTags.map((tag, index) => (
                                      <View key={index} style={styles.chip}>
                                          <Text style={styles.chipText}>{tag}</Text>
                                          <TouchableOpacity onPress={() => setCurrentVariantTags(currentVariantTags.filter((_, i) => i !== index))}><Icon name="x" size={14} color="#000" /></TouchableOpacity>
                                      </View>
                                  ))}
                             </View>
                             
                             <TouchableOpacity 
                                style={[styles.secondaryBtn, (!newVariantName || currentVariantTags.length === 0) && { opacity: 0.5 }]} 
                                onPress={addVariantOption}
                                disabled={!newVariantName || currentVariantTags.length === 0}
                             >
                                  <Text style={styles.secondaryBtnText}>+ Add Variant Group</Text>
                             </TouchableOpacity>
                        </View>
                        
                        {/* Generated Variants List */}
                        {tempProduct.generatedVariants && tempProduct.generatedVariants.length > 0 && (
                            <View style={{ marginTop: 15 }}>
                                {tempProduct.generatedVariants.map((v, i) => (
                                    <View key={i} style={styles.variantRowCompact}>
                                        <Text style={styles.variantNameCompact}>{v.name}</Text>
                                        <Text style={{ color: '#fff' }}>${v.price}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={styles.formActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.addButton} onPress={addProduct}><Text style={styles.addButtonText}>Save Product</Text></TouchableOpacity>
                        </View>
                    </View>
                )}
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
        <TouchableOpacity style={[styles.submitButton, (uploading || isCompressing) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={uploading || isCompressing}>
          {uploading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Post Video</Text>}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoPlaceholder: { height: 300, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  videoSelected: { width: '100%', height: '100%' },
  videoPreview: { width: '100%', height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  changeOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },
  placeholderText: { color: '#666', marginTop: 10 },
  captionInput: { color: '#fff', fontSize: 16, padding: 15, minHeight: 80 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', margin: 15 },
  productCard: { flexDirection: 'row', backgroundColor: '#1a1a1a', marginHorizontal: 15, marginBottom: 10, padding: 10, borderRadius: 8, alignItems: 'center' },
  productThumb: { width: 50, height: 50, borderRadius: 4, marginRight: 10 },
  productTitle: { color: '#fff', fontWeight: 'bold' },
  productPrice: { color: '#bbb' },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', margin: 15, padding: 15, borderRadius: 8 },
  addProductText: { fontWeight: 'bold', marginLeft: 10 },
  
  formCard: { backgroundColor: '#1a1a1a', margin: 15, padding: 15, borderRadius: 12 },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  formTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  categoryListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  categoryListText: { color: '#fff', fontSize: 16 },
  
  imagePicker: { width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  imagePreviewContainer: { width: 60, height: 60, marginRight: 10, position: 'relative' },
  imagePreview: { width: '100%', height: '100%', borderRadius: 8 },
  removeImageBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  
  input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
  dynamicFormSection: { marginTop: 15, marginBottom: 15 },
  sectionHeader: { color: '#888', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  attributeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  
  chipsInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  addChipBtn: { backgroundColor: '#fff', width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  chipText: { marginRight: 5, fontWeight: 'bold' },
  optionChip: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8 },
  optionChipText: { color: '#fff' },
  secondaryBtn: { alignItems: 'center', padding: 10, borderWidth: 1, borderColor: '#666', borderRadius: 8, marginTop: 5 },
  secondaryBtnText: { color: '#ccc' },
  addedGroupChip: { backgroundColor: '#2a2a2a', padding: 10, borderRadius: 8, marginBottom: 5 },
  
  variantRowCompact: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  variantNameCompact: { color: '#ddd' },
  
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#333', alignItems: 'center' },
  cancelButtonText: { color: '#fff' },
  addButton: { flex: 2, padding: 15, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center' },
  addButtonText: { fontWeight: 'bold' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.9)' },
  submitButton: { backgroundColor: '#fff', padding: 15, borderRadius: 30, alignItems: 'center' },
  submitButtonText: { fontWeight: 'bold', fontSize: 16 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginBottom: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, height: '100%' }, // Ensure high enough
});
