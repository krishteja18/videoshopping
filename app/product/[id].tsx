import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import Feather from '@expo/vector-icons/Feather';
import Octicons from '@expo/vector-icons/Octicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useUserStore();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>('M');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Mock Variants
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const colors = [
      { name: 'Black', code: '#000000' },
      { name: 'White', code: '#FFFFFF' },
      { name: 'Navy', code: '#000080' },
      { name: 'Beige', code: '#F5F5DC' }
  ];

  useEffect(() => {
      if (colors.length > 0) setSelectedColor(colors[0].name);
  }, []);
  
  const mainImageRef = React.useRef<FlatList>(null);

  const scrollToIndex = (index: number) => {
    setActiveImageIndex(index);
    mainImageRef.current?.scrollToOffset({ offset: index * width, animated: true });
  };

  // Mock Data
  const mockSpecs = [
      { label: 'Material', value: '100% Premium Cotton' },
      { label: 'Fit', value: 'Regular Fit' },
      { label: 'Sleeve', value: 'Full Sleeve' },
      { label: 'Wash Care', value: 'Machine Wash' },
      { label: 'Origin', value: 'India' }
  ];

  const mockReviews = [
      { id: 1, user: 'Rahul K.', rating: 5, comment: 'Amazing quality! Fits perfectly.', date: '2 days ago' },
      { id: 2, user: 'Sneha P.', rating: 4, comment: 'Good fabric but slightly loose.', date: '1 week ago' }
  ];

  const mockSimilarProducts = [
      { id: 101, title: 'Classic White Tee', price: 499, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop' },
      { id: 102, title: 'Denim Jacket', price: 1299, image: 'https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=400&h=400&fit=crop' },
      { id: 103, title: 'Chino Shorts', price: 799, image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop' }
  ];

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles!products_seller_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    // Implement Add to Cart logic here
    alert('Added to cart!');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image Section */}
        <View style={styles.imageContainer}>
          <FlatList
            ref={mainImageRef}
            data={product.images && product.images.length > 0 ? product.images : [product.image_url]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(index);
            }}
            renderItem={({ item }) => (
                <View style={{ width, height: height * 0.5 }}>
                    <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
                </View>
            )}
          />
          
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.1)']}
            style={styles.imageOverlay}
            pointerEvents="none"
          />

          {/* Pagination Dots */}
          {(product.images && product.images.length > 1) && (
              <View style={styles.paginationContainer}>
                  {product.images.map((_: any, idx: number) => (
                      <View 
                        key={idx} 
                        style={[
                            styles.paginationDot, 
                            idx === activeImageIndex && styles.paginationDotActive
                        ]} 
                      />
                  ))}
              </View>
          )}
          
          {/* Header Actions */}
          <SafeAreaView style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <Octicons name="chevron-left" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.rightIcons}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setIsLiked(!isLiked)}>
                <Octicons name={isLiked ? "heart-fill" : "heart"} size={18} color={isLiked ? "#FF4B4B" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                 <Octicons name="share-android" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          


          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.brandText}>{product.category || 'Trending'}</Text>
                <Text style={styles.productTitle}>{product.title}</Text>
            </View>
            <View style={styles.priceTag}>
               <Text style={styles.priceText}>₹{product.price}</Text>
               {product.original_price && (
                   <Text style={styles.oldPrice}>₹{product.original_price}</Text>
               )}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingContainer}>
              <View style={styles.starRow}>
                {[1,2,3,4,5].map((s) => (
                    <Octicons key={s} name="star-fill" size={14} color={s <= 4 ? "#FFD700" : "#E0E0E0"} style={{ marginRight: 2 }} />
                ))}
              </View>
              <Text style={styles.ratingCount}>4.8 (1.2k reviews)</Text>
          </View>



          <View style={styles.divider} />

           {/* Color Selection */}
           <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color: {selectedColor}</Text>
              <View style={styles.colorRow}>
                  {colors.map((color) => (
                      <TouchableOpacity 
                        key={color.name}
                        onPress={() => setSelectedColor(color.name)}
                        style={[
                            styles.colorOption,
                            selectedColor === color.name && styles.colorOptionSelected,
                            { backgroundColor: color.code }
                        ]}
                      >
                          {selectedColor === color.name && color.name === 'White' && <View style={styles.colorCheckBlack} />}
                      </TouchableOpacity>
                  ))}
              </View>
           </View>

           {/* Size Selection */}
           <View style={styles.section}>
              <View style={styles.sizeHeader}>
                  <Text style={styles.sectionTitle}>Size</Text>
                  <TouchableOpacity>
                      <Text style={styles.sizeGuideText}>Size Guide</Text>
                  </TouchableOpacity>
              </View>
              <View style={styles.sizeRow}>
                  {sizes.map((size) => (
                      <TouchableOpacity 
                        key={size}
                        onPress={() => setSelectedSize(size)}
                        style={[
                            styles.sizeOption,
                            selectedSize === size && styles.sizeOptionSelected
                        ]}
                      >
                          <Text style={[
                              styles.sizeText,
                              selectedSize === size && styles.sizeTextSelected
                          ]}>{size}</Text>
                      </TouchableOpacity>
                  ))}
              </View>
           </View>

          {/* Description */}
          <View style={styles.section}>
             <Text style={styles.sectionTitle}>Description</Text>
             <Text style={styles.descriptionText}>
                {product.description || "No description available for this product. Check out the video to see it in action!"}
             </Text>
          </View>

          {/* Delivery Info (Mock) */}
          <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                  <Feather name="truck" size={20} color="#666" />
                  <Text style={styles.infoText}>Free Delivery</Text>
              </View>
              <View style={styles.infoItem}>
                  <Octicons name="shield-check" size={20} color="#666" />
                  <Text style={styles.infoText}>Original Product</Text>
              </View>
          </View>

          <View style={styles.divider} />

          {/* Specifications */}
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <View style={styles.specsTable}>
                  {mockSpecs.map((spec, index) => (
                      <View key={index} style={[styles.specRow, index === mockSpecs.length - 1 && { borderBottomWidth: 0 }]}>
                          <Text style={styles.specLabel}>{spec.label}</Text>
                          <Text style={styles.specValue}>{spec.value}</Text>
                      </View>
                  ))}
              </View>
          </View>

          <View style={styles.divider} />

          {/* Reviews */}
          <View style={styles.section}>
              <View style={styles.reviewHeader}>
                  <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
                  <TouchableOpacity>
                      <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
              </View>
              
              {/* Rating Summary Block */}
              <View style={styles.ratingSummary}>
                  <View style={styles.bigRating}>
                      <Text style={styles.bigRatingText}>4.8</Text>
                      <Octicons name="star-fill" size={20} color="#FFD700" />
                  </View>
                  <Text style={styles.totalRatingsText}>1.2k Verified Buyers</Text>
              </View>

              {/* Recent Reviews */}
              {mockReviews.map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                      <View style={styles.reviewTop}>
                          <View style={styles.reviewerBadge}>
                              <Text style={styles.reviewerName}>{review.user.charAt(0)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                              <Text style={styles.reviewUser}>{review.user}</Text>
                              <View style={styles.starRowSmall}>
                                {[...Array(5)].map((_, i) => (
                                    <Octicons key={i} name="star-fill" size={12} color={i < review.rating ? "#FFD700" : "#E0E0E0"} style={{ marginRight: 2 }} />
                                ))}
                              </View>
                          </View>
                          <Text style={styles.reviewDate}>{review.date}</Text>
                      </View>
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                  </View>
              ))}
          </View>

          <View style={styles.divider} />

          {/* Similar Products */}
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>You Might Also Like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarList}>
                  {mockSimilarProducts.map((item) => (
                      <TouchableOpacity key={item.id} style={styles.similarItem} onPress={() => router.push(`/product/${item.id}`)}>
                          <Image source={{ uri: item.image }} style={styles.similarImage} />
                          <View style={styles.similarInfo}>
                              <Text style={styles.similarTitle} numberOfLines={1}>{item.title}</Text>
                              <Text style={styles.similarPrice}>₹{item.price}</Text>
                          </View>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
          </View>

          <View style={{ height: 100 }} /> 
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={styles.bottomBar}>
         <View style={styles.qtyContainer}>
             <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
                 <Octicons name="dash" size={24} color="#000" />
             </TouchableOpacity>
             <Text style={styles.qtyText}>{quantity}</Text>
             <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
                 <Octicons name="plus" size={24} color="#000" />
             </TouchableOpacity>
         </View>
         
         <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart} activeOpacity={0.8}>
             <Text style={styles.addToCartText}>Add to Bag  •  ₹{(product?.price * quantity).toFixed(2)}</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backLink: {
    color: 'blue',
    marginTop: 10,
    fontFamily: 'Nunito-Medium',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.5,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  rightIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)', // iOS only
  },
  contentContainer: {
    flex: 1,
    marginTop: -20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  thumbnailList: {
      marginBottom: 20,
      marginTop: 0,
  },
  thumbnailItem: {
      width: 60,
      height: 60,
      borderRadius: 10,
      marginRight: 10,
      borderWidth: 2,
      borderColor: 'transparent',
      overflow: 'hidden',
  },
  thumbnailItemActive: {
      borderColor: '#000',
  },
  thumbnailImage: {
      width: '100%',
      height: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  brandText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Nunito-Medium',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1,
  },
  productTitle: {
    fontSize: 24,
    fontFamily: 'Nunito-SemiBold', // Replaced bold
    color: '#1a1a1a',
    lineHeight: 32,
  },
  priceTag: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 26,
    fontFamily: 'Nunito-Medium', // Replaced 800
    color: '#000',
  },
  oldPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    fontFamily: 'Nunito-Regular',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  starRow: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingCount: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 20,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#000',
  },
  sellerRole: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Nunito-Regular',
  },
  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000',
  },
  followButtonText: {
    fontSize: 12,
    fontFamily: 'Nunito-Medium',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-SemiBold',
    color: '#000',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
    fontFamily: 'Nunito-Regular',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Nunito-Medium',
    color: '#444',
  },
  
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 30, // For Home Indicator
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 30,
    padding: 4,
    marginRight: 15,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qtyText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    marginHorizontal: 15,
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: '#000',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Medium',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 5,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  colorOptionSelected: {
    borderColor: '#000',
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  colorCheck: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#fff',
  },
  colorCheckBlack: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000',
},
  sizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sizeGuideText: {
    color: '#666',
    fontSize: 13,
    textDecorationLine: 'underline',
    fontFamily: 'Nunito-Medium',
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeOption: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  sizeOptionSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  sizeText: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'Nunito-Medium',
  },
  sizeTextSelected: {
    color: '#fff',
    fontFamily: 'Nunito-SemiBold',
  },
  specsTable: {
      borderWidth: 1,
      borderColor: '#f0f0f0',
      borderRadius: 8,
      overflow: 'hidden',
  },
  specRow: {
      flexDirection: 'row',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  specLabel: {
      flex: 1,
      color: '#666',
      fontFamily: 'Nunito-Regular',
      fontSize: 14,
  },
  specValue: {
      flex: 1,
      color: '#000',
      fontFamily: 'Nunito-Medium',
      fontSize: 14,
  },
  reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 15,
  },
  seeAllText: {
      color: '#007AFF',
      fontSize: 14,
      fontFamily: 'Nunito-Medium',
  },
  ratingSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      backgroundColor: '#f9f9f9',
      padding: 15,
      borderRadius: 12,
  },
  bigRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginRight: 15,
  },
  bigRatingText: {
      fontSize: 32,
      fontFamily: 'Nunito-Bold',
      color: '#333',
  },
  totalRatingsText: {
      color: '#666',
      fontSize: 14,
      fontFamily: 'Nunito-Regular',
  },
  reviewItem: {
      marginBottom: 15,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  reviewTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  reviewerBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
  },
  reviewerName: { // Initial
      fontSize: 14,
      fontFamily: 'Nunito-Bold',
      color: '#555',
  },
  reviewUser: {
      fontSize: 14,
      fontFamily: 'Nunito-SemiBold',
      color: '#000',
      marginBottom: 2,
  },
  starRowSmall: {
      flexDirection: 'row',
  },
  reviewDate: {
      fontSize: 12,
      color: '#999',
  },
  reviewComment: {
      fontSize: 14,
      color: '#444',
      lineHeight: 20,
      fontFamily: 'Nunito-Regular',
  },
  similarList: {
      gap: 15,
      paddingRight: 20,
  },
  similarItem: {
      width: 140,
      marginRight: 15,
  },
  similarImage: {
      width: 140,
      height: 180,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: '#f0f0f0',
  },
  similarInfo: {
      paddingHorizontal: 4,
  },
  similarTitle: {
      fontSize: 14,
      fontFamily: 'Nunito-Medium',
      color: '#000',
      marginBottom: 4,
  },
  similarPrice: {
      fontSize: 14,
      fontFamily: 'Nunito-Bold',
      color: '#000',
  },
  paginationContainer: {
      position: 'absolute',
      bottom: 30,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
  },
  paginationDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.5)',
      marginHorizontal: 4,
  },
  paginationDotActive: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#fff',
      transform: [{ scale: 1.2 }],
  },
});
