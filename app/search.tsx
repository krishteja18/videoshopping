import { supabase } from '@/lib/supabase';
import { useSearchStore } from '@/store/useStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

// --- Dummy Data (Phase 1) ---
const CATEGORIES = [
  { id: 1, name: 'Fashion', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop' },
  { id: 2, name: 'Tech', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop' }, // sleek tech
  { id: 3, name: 'Beauty', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop' },
  { id: 4, name: 'Decor', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&h=400&fit=crop' },
];

const FOR_YOU_ITEMS = [
  { id: '1', type: 'video', title: 'Summer Lookbook', price: '$45.00', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop', height: 280, label: 'LIFESTYLE', labelColor: '#FF6B6B' }, // Taller
  { id: '2', type: 'product', title: 'Minimalist Setup', price: '$129.99', image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&h=500&fit=crop', height: 200, label: 'TECH', labelColor: '#4ECDC4' },
  { id: '3', type: 'product', title: 'Skincare Routine', price: '$29.00', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=500&fit=crop', height: 220, label: 'SKINCARE', labelColor: '#A8A8A8' },
  { id: '4', type: 'video', title: 'Ocean Vibes', price: '$185.00', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop', height: 260, label: 'LUXURY', labelColor: '#C792EA' },
  { id: '5', type: 'product', title: 'Urban Hiking', price: '$85.00', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=500&fit=crop', height: 210, label: '', labelColor: '' },
];


const SUGGESTIONS = [
  { id: 1, text: 'Summer Dress', type: 'trending' },
  { id: 2, text: 'Sunscreen', type: 'history' },
  { id: 3, text: 'Sunglasses men', type: 'trending' },
  { id: 4, text: 'Summer vibe party', type: 'trending' },
  { id: 5, text: 'Beach towel', type: 'history' },
  { id: 6, text: 'Swimwear', type: 'trending' },
  { id: 7, text: 'Sandals', type: 'history' },
];

export default function SearchScreen() {
  const router = useRouter();
  
  // Use Zustand for state management
  const { query, viewMode, filteredVideos, setQuery, setViewMode, setFilteredVideos } = useSearchStore();
  const [isSearching, setIsSearching] = React.useState(false);

  // Search Logic
  const handleTextChange = (text: string) => {
    setQuery(text);
    if (text.trim().length > 0) {
      setViewMode('suggestions');
    } else {
      setViewMode('discovery');
    }
  };

  const handleSearchSubmit = async (searchTerm?: string) => {
    const term = searchTerm || query;
    if (term.trim().length === 0) return;
    
    setQuery(term);
    setViewMode('results');
    setIsSearching(true);
    Keyboard.dismiss();
    
    // Fetch videos from backend based on search term
    try {
      // Step 1: Search for products that match the search term (title or category)
      const { data: matchingProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .or(`title.ilike.%${term}%,category.ilike.%${term}%`);

      if (productsError) throw productsError;

      // Step 2: Get video IDs that have these matching products
      let videoIdsFromProducts: string[] = [];
      if (matchingProducts && matchingProducts.length > 0) {
        const productIds = matchingProducts.map(p => p.id);
        const { data: videoProducts, error: vpError } = await supabase
          .from('video_products')
          .select('video_id')
          .in('product_id', productIds);

        if (vpError) throw vpError;
        videoIdsFromProducts = videoProducts?.map(vp => vp.video_id) || [];
      }

      // Step 3: Fetch videos that either:
      // - Have description matching the search term, OR
      // - Have products matching the search term (from step 2)
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          video_url,
          description,
          created_at,
          seller:profiles (
            username,
            full_name,
            avatar_url
          ),
          video_products (
            products (
              id,
              title,
              price,
              image_url
            )
          )
        `)
        .or(`description.ilike.%${term}%${videoIdsFromProducts.length > 0 ? `,id.in.(${videoIdsFromProducts.join(',')})` : ''}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedVideos = data.map((v: any, idx: number) => {
          const firstProduct = v.video_products[0]?.products;
          return {
            id: v.id,
            username: v.seller?.username ? `@${v.seller.username}` : (v.seller?.full_name || 'Unknown'),
            description: v.description,
            likes: '0',
            comments: '0',
            videoUrl: v.video_url,
            avatar: v.seller?.avatar_url,
            // Add fields for MasonryTile display
            image: firstProduct?.image_url || 'https://via.placeholder.com/300x400',
            height: idx % 3 === 0 ? 280 : idx % 3 === 1 ? 220 : 250, // Varied heights for masonry
            title: firstProduct?.title || v.description?.substring(0, 30) || 'Video',
            price: firstProduct ? `₹${firstProduct.price}` : '',
            products: v.video_products.map((vp: any) => ({
              id: vp.products.id,
              title: vp.products.title,
              price: `₹${vp.products.price}`,
              originalPrice: vp.products.original_price ? `₹${vp.products.original_price}` : undefined,
              rating: '4.8 (1.2k)',
              image: vp.products.image_url
            }))
          };
        });
        setFilteredVideos(formattedVideos);
      } else {
        // No results found
        setFilteredVideos([]);
      }
    } catch (error) {
      console.error('Error searching videos:', error);
      // Fallback to dummy data on error
      setFilteredVideos(FOR_YOU_ITEMS);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setViewMode('discovery');
    setFilteredVideos([]);
    Keyboard.dismiss();
  };

  // Navigate to home feed with filtered videos
  const handleVideoClick = (videoIndex: number) => {
    router.push({
      pathname: '/(tabs)',
      params: {
        filteredVideos: JSON.stringify(filteredVideos),
        startIndex: videoIndex.toString()
      }
    });
  };

  // --- Components ---

  const renderSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      {SUGGESTIONS.map((item, index) => (
        <TouchableOpacity 
            key={item.id} 
            style={styles.suggestionItem} 
            activeOpacity={0.7}
            onPress={() => handleSearchSubmit(item.text)}
        >
          <View style={styles.suggestionIconContainer}>
             <Icon 
                name={item.type === 'history' ? 'clock' : 'search'} 
                size={16} 
                color="#666" 
             />
          </View>
          <Text style={styles.suggestionText}>
            {item.text}
          </Text>
          <View style={styles.suggestionArrow}>
            <Icon name="arrow-up-left" size={18} color="#ccc" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const MasonryTile = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={[styles.masonryItem, { height: item.height }]}
      onPress={() => handleVideoClick(index)}
    >
      <Image source={{ uri: item.image }} style={styles.masonryImage} resizeMode="cover" />
      
      {/* Dark Gradient Overlay for Readability */}
      <LinearGradient 
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']} 
        style={styles.masonryOverlay} 
      />

      {/* Content */}
      <View style={styles.masonryContent}>
        
        <View style={styles.bottomInfo}>
             {item.price && <Text style={styles.itemTitle}>{item.title}</Text>}
             {item.price && <Text style={styles.itemPrice}>{item.price}</Text>}
        </View>
      </View>
      
        {/* User Avatar (Mock) */}
         <View style={styles.userAvatarContainer}>
             <Image source={{ uri: `https://i.pravatar.cc/150?u=${item.id}` }} style={styles.userAvatar} />
         </View>

    </TouchableOpacity>
  );

  // Skeleton Loader Component
  const SkeletonTile = ({ height }: { height: number }) => (
    <View style={[styles.masonryItem, { height, backgroundColor: '#f0f0f0', marginBottom: 12 }]}>
      <View style={{ flex: 1, padding: 12, justifyContent: 'flex-end' }}>
        <View style={{ width: '70%', height: 12, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 8 }} />
        <View style={{ width: '40%', height: 10, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
      </View>
    </View>
  );

  const renderSkeletonLoader = () => (
    <View style={styles.resultsContainer}>
      <View style={{ width: 200, height: 24, backgroundColor: '#e0e0e0', borderRadius: 4, marginHorizontal: 20, marginBottom: 15 }} />
      <View style={styles.masonryContainer}>
        <View style={styles.column}>
          <SkeletonTile height={280} />
          <SkeletonTile height={250} />
          <SkeletonTile height={220} />
        </View>
        <View style={styles.column}>
          <SkeletonTile height={220} />
          <SkeletonTile height={280} />
          <SkeletonTile height={250} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      
      {/* Top Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 12, marginRight: 8 }}>
                <Icon name="arrow-left" size={20} color="#333" />
            </TouchableOpacity>
            <TextInput
                style={styles.input}
                placeholder="Search products, brands and videos"
                placeholderTextColor="#999"
                value={query}
                onChangeText={handleTextChange}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchSubmit()}
            />
            {query.length > 0 ? (
                <TouchableOpacity onPress={handleClearSearch} style={{ marginRight: 12 }}>
                    <Icon name="x" size={18} color="#999" />
                </TouchableOpacity>
            ) : (
                <Icon name="mic" size={18} color="#333" style={{ marginRight: 12 }} />
            )}
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {viewMode === 'suggestions' ? (
            renderSuggestions()
        ) : viewMode === 'results' ? (
            isSearching ? (
              renderSkeletonLoader()
            ) : (
              <View style={styles.resultsContainer}>
                  {filteredVideos.length > 0 ? (
                    <View style={styles.masonryContainer}>
                      <View style={styles.column}>
                          {filteredVideos.filter((_, i) => i % 2 !== 0).map((item, idx) => (
                            <MasonryTile key={item.id} item={item} index={filteredVideos.indexOf(item)} />
                          ))}
                      </View>
                      <View style={styles.column}>
                          {filteredVideos.filter((_, i) => i % 2 === 0).map((item, idx) => (
                            <MasonryTile key={item.id} item={item} index={filteredVideos.indexOf(item)} />
                          ))}
                      </View>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', paddingTop: 60 }}>
                      <Icon name="search" size={48} color="#ccc" />
                      <Text style={{ color: '#999', fontSize: 16, marginTop: 16 }}>No results found</Text>
                      <Text style={{ color: '#ccc', fontSize: 14, marginTop: 8 }}>Try a different search term</Text>
                    </View>
                  )}
              </View>
            )
        ) : (
          <>
            {/* 1. Magazine Header */}
            <View style={styles.heroHeader}>
                <Text style={styles.heroTextItalic}>SUMMER</Text>
                <Text style={styles.heroTextOutline}> VIBES</Text>
            </View>

            {/* 2. Categories */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Categories</Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={styles.categoryTile} 
                    activeOpacity={0.8}
                    onPress={() => handleSearchSubmit(cat.name)}
                  >
                    <Image source={{ uri: cat.image }} style={styles.categoryImage} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.categoryGradient} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 3. For You (Masonry) */}
             <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>For You</Text>
                </View>

                <View style={styles.masonryContainer}>
                    <View style={styles.column}>
                        {FOR_YOU_ITEMS.filter((_, i) => i % 2 === 0).map((item, idx) => (
                          <MasonryTile key={item.id} item={item} index={FOR_YOU_ITEMS.indexOf(item)} />
                        ))}
                    </View>
                    <View style={styles.column}>
                        {FOR_YOU_ITEMS.filter((_, i) => i % 2 !== 0).map((item, idx) => (
                          <MasonryTile key={item.id} item={item} index={FOR_YOU_ITEMS.indexOf(item)} />
                        ))}
                    </View>
                </View>
             </View>
          </>
        )}
        
        <View style={{ height: 60 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30, // Pill shape
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Slightly more visible shadow for white on white
    shadowRadius: 5,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#000',
    height: '100%',
  },
  scrollContent: {
    paddingTop: 0,
  },
  // Hero
  heroHeader: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heroTextItalic: {
    fontSize: 32,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#000',
  },
  heroTextOutline: {
      fontSize: 32,
      fontWeight: '900',
      textShadowColor: 'rgba(0, 0, 0, 0.8)', // Simulate stroke
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
      // Note: React Native text stroke support is limited, this is a fallback visual
      // For real outline, we'd use absolute positioning or svg
      // Simplified for this demo:
      color: '#333', 
  },
  // Sections
  section: {
    marginBottom: 30,
  },
  sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500', // Slightly lighter than bold
    color: '#111',
  },
  arrowButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#f2f2f2',
      justifyContent: 'center',
      alignItems: 'center',
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
},
  // Categories
  categoriesRow: {
    paddingLeft: 20,
  },
  categoryTile: {
    width: 140, // Larger square tiles
    height: 140,
    borderRadius: 24, // Very rounded
    marginRight: 15,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryGradient: {
      ...StyleSheet.absoluteFillObject,
  },
  categoryName: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      color: '#fff',
      fontSize: 18,
      fontWeight: '500',
      fontStyle: 'italic',
  },
  // Masonry
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
  },
  column: {
    flex: 1,
    paddingHorizontal: 5,
  },
  masonryItem: {
    marginBottom: 10,
    borderRadius: 24, // Matches reference roundedness
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    position: 'relative',
    // Shadow for depth? The reference looks flat but elevated
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  masonryImage: {
      width: '100%',
      height: '100%',
  },
  masonryOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '50%', // Gradient from bottom up
  },
  masonryContent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
      padding: 12,
  },
  labelContainer: {
      alignSelf: 'flex-start',
  },
  // Suggestions
  suggestionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionIconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  suggestionArrow: {
    marginLeft: 10,
  },
  categoryLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
  },
  liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 4,
  },
  liveText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
  },
  playIconContainer: {
      alignSelf: 'center',
      marginTop: 'auto',
      marginBottom: 'auto',
      opacity: 0.9,
  },
  bottomInfo: {
      marginTop: 'auto',
  },
  itemTitle: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      marginBottom: 2,
  },
  itemPrice: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
  userAvatarContainer: {
      position: 'absolute',
      bottom: -15, // Hanging off? Or below. Reference image has them below the card.
      // Let's put them below content for now, but since we are handling full image tiles,
      // maybe integrated is better. 
      // The reference shows a circle avatar BELOW the main image card.
      // To achieve that, we'd need to wrap the Tile in a View that has the tile + avatar row.
      // For this "MasonryTile" component, let's keep it simple. 
      // I will Hide avatar for now to keep the layout clean as per the topmost "For You" reference (which are just tiles).
      display: 'none', 
  },
  userAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#fff',
  },
  // Results
  resultsContainer: {
    paddingBottom: 20,
  },
  resultsHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
});

