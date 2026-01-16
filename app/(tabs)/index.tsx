import ProfileView from '@/components/ProfileView';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect } from '@react-navigation/native';
import { Audio, ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, GestureResponderEvent, Image, PanResponder, Pressable, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window');

// Sample video shopping data
const DUMMY_VIDEOS = [
  {
    id: 1,
    username: '@fruitfulfinds',
    description: 'Sweet, juicy, and straight from the farm!',
    likes: '12.2k',
    comments: '1.5k',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=800&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b5bd25fe?w=50&h=50&fit=crop&crop=face',
    products: [
      {
        id: 101,
        title: 'Fresh Organic Apples',
        price: '$2.99/lb',
        originalPrice: '$3.99',
        rating: '4.9 (540)',
        image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop'
      }
    ]
  },
  {
    id: 2,
    username: '@techdeals',
    description: 'Premium sound quality 🎧',
    likes: '15.3k',
    comments: '2.1k',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=800&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face',
    products: [
      {
        id: 201,
        title: 'Wireless Headphones',
        price: '$89.99',
        originalPrice: '$129.99',
        rating: '4.8 (2.3k)',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop'
      }
    ]
  }
];

const ProductCarousel = ({ products }: { products: any[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (!products || products.length === 0) return null;

  return (
      <View style={styles.productCarouselContainer}>
        <FlatList
          data={products}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(product) => String(product.id)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item: product }) => (
            <View style={styles.productCardWrapper}>
              <BlurView intensity={20} tint="dark" style={styles.productCard}>
                <Image source={{ uri: product.image }} style={styles.productImagePlaceholder} resizeMode="cover" />
                <View style={styles.productDetails}>
                  <Text style={styles.cardProductTitle} numberOfLines={1}>{product.title}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.cardPrice}>{product.price}</Text>
                    {product.originalPrice && (
                      <Text style={styles.cardOldPrice}>{product.originalPrice}</Text>
                    )}
                  </View>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={12} color="#FFD700" style={{ marginRight: 4 }} />
                    <Text style={styles.ratingText}>{product.rating}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          )}
        />
        {(products.length > 0) && (
          <View style={styles.paginationContainer}>
             {products.map((_: any, dotIndex: number) => (
                <View 
                  key={dotIndex} 
                  style={[
                    styles.paginationDot, 
                    dotIndex === activeIndex && styles.paginationDotActive
                  ]} 
                />
             ))}
          </View>
        )}
      </View>
  );
};

const VideoItem = ({ item, index, currentIndex, muted, setMuted, videoRefs, ensureAudio }: any) => {
  const [progress, setProgress] = useState(0);
  const isScrubbing = useRef(false);
  const duration = useRef(0);
  const localVideoRef = useRef<Video | null>(null);

  // Memoize source to prevent unnecessary reloads
  const videoSource = useMemo(() => ({ uri: item.videoUrl }), [item.videoUrl]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (status.durationMillis) {
        duration.current = status.durationMillis;
        if (!isScrubbing.current) {
          const p = status.positionMillis / status.durationMillis;
          setProgress(p);
        }
      }
    }
  };

  const handleSeek = (ratio: number) => {
    const seekPosition = ratio * duration.current;
    if (localVideoRef.current) {
      localVideoRef.current.setPositionAsync(seekPosition);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        isScrubbing.current = true;
        const { locationX } = evt.nativeEvent;
        // Now using full width for calculation
        const ratio = Math.max(0, Math.min(1, locationX / width));
        setProgress(ratio);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX } = evt.nativeEvent;
        const ratio = Math.max(0, Math.min(1, locationX / width));
        setProgress(ratio);
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const { locationX } = evt.nativeEvent;
        const ratio = Math.max(0, Math.min(1, locationX / width));
        handleSeek(ratio);
        // Small delay before allowing playback updates to resume tracking
        setTimeout(() => {
          isScrubbing.current = false;
        }, 200);
      },
      onPanResponderTerminate: () => {
        isScrubbing.current = false;
      },
    })
  ).current;

  return (
    <View style={styles.videoContainer}>
      <Video
        ref={(ref) => {
          localVideoRef.current = ref;
          videoRefs.current[index] = ref;
        }}
        source={videoSource}
        style={styles.backgroundVideo}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={index === currentIndex}
        isMuted={muted}
        onLoadStart={ensureAudio}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        progressUpdateIntervalMillis={100}
        onError={(e) => console.log('Video error:', e)}
      />

      <Pressable
        style={styles.videoTouchLayer}
        onPress={() => setMuted((m: boolean) => !m)}
        onLongPress={() => setMuted(false)}
      >
        {!muted && (
           <View style={styles.muteBadge}>
             <Icon name="volume-2" size={20} color="#fff" />
           </View>
        )}
      </Pressable>

      <View style={styles.gradientOverlay} />

      <View style={styles.rightActions}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: item.avatar || 'https://via.placeholder.com/50' }} 
              style={styles.avatarImage} 
            />
          </View>
          <View style={styles.plusBadge}>
            <Icon name="plus" size={12} color="#fff" />
          </View>
        </View>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="video" size={28} color="#fff" />
          <Text style={styles.actionLabel}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="heart" size={28} color="#fff" />
          <Text style={styles.actionCount}>{item.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="message-circle" size={28} color="#fff" />
          <Text style={styles.actionCount}>{item.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share-2" size={28} color="#fff" />
          <Text style={styles.actionCount}>89</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomInfoContainer}>
        <View style={styles.userInfoContainer}>
          <View style={styles.userRow}>
             <Image 
               source={{ uri: item.avatar || 'https://via.placeholder.com/32' }} 
               style={styles.userAvatarSmall} 
             />
            <Text style={styles.username}>{item.username}</Text>
            <Icon name="check-circle" size={14} color="#4A90E2" style={styles.verifiedBadge} />
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {item.description} <Text style={styles.hashtag}>#fashion #style</Text>
          </Text>
        </View>

        <ProductCarousel products={item.products} />
      </View>

      {/* Scrubbing Progress Bar */}
      <View 
        style={styles.progressBarContainer}
        {...panResponder.panHandlers}
      >
        <View style={[styles.progressBarActive, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const { fetchProfile } = useUserStore();
  const [activeTab, setActiveTab] = useState('home');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const videoRefs = useRef<(Video | null)[]>([]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchVideos = async () => {
    try {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedVideos = data.map((v: any) => ({
          id: v.id,
          username: v.seller?.username ? `@${v.seller.username}` : (v.seller?.full_name || 'Unknown'),
          description: v.description,
          likes: '0', 
          comments: '0', 
          videoUrl: v.video_url,
          avatar: v.seller?.avatar_url,
          products: v.video_products.map((vp: any) => ({
            id: vp.products.id,
            title: vp.products.title,
            price: `$${vp.products.price}`,
            image: vp.products.image_url
          }))
        }));
        setVideos(formattedVideos);
      } else {
        setVideos(DUMMY_VIDEOS);
      }
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      setVideos(DUMMY_VIDEOS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  useFocusEffect(
    useCallback(() => {
        return () => {
             videoRefs.current.forEach(ref => ref?.pauseAsync());
        };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVideos();
  };

  const ensureAudio = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: 2,
      interruptionModeAndroid: 2,
    });
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setCurrentIndex(newIndex);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const handleSignOut = async () => {
    try {
      try {
        const isGoogleSignedIn = await GoogleSignin.isSignedIn();
        if (isGoogleSignedIn) await GoogleSignin.signOut();
      } catch (e) {}
      await supabase.auth.signOut();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTabs}>
        <Text style={styles.headerTabInactive}>Following</Text>
        <View style={styles.headerTabDivider} />
        <Text style={styles.headerTabActive}>For You</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {activeTab === 'profile' ? null : renderHeader()}
      {activeTab === 'profile' ? (
        <ProfileView onSignOut={handleSignOut} />
      ) : (
      <FlatList
        data={videos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <VideoItem 
            item={item} 
            index={index} 
            currentIndex={currentIndex} 
            muted={muted} 
            setMuted={setMuted} 
            videoRefs={videoRefs}
            ensureAudio={ensureAudio}
          />
        )}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        ListEmptyComponent={
            loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : null
        }
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
            <Icon name="home" size={24} color={activeTab === 'home' ? '#000' : '#666'} />
            <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('discover')}>
            <Icon name="compass" size={24} color={activeTab === 'discover' ? '#000' : '#666'} />
             <Text style={[styles.navLabel, activeTab === 'discover' && styles.navLabelActive]}>Discover</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton}>
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('favorites')}>
            <Icon name="heart" size={24} color={activeTab === 'favorites' ? '#000' : '#666'} />
             <Text style={[styles.navLabel, activeTab === 'favorites' && styles.navLabelActive]}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
            <Icon name="user" size={24} color={activeTab === 'profile' ? '#000' : '#666'} />
             <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTabs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTabInactive: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.7,
    fontWeight: '600',
  },
  headerTabDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#fff',
    opacity: 0.5,
    marginHorizontal: 12,
  },
  headerTabActive: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  videoContainer: {
    width,
    height,
    position: 'relative',
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  videoTouchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  muteBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 30,
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    bottom: 220,
    alignItems: 'center',
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  avatarContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  avatarWrapper: {
    padding: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  plusBadge: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  bottomInfoContainer: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  userInfoContainer: {
    marginBottom: 16,
    width: '80%',
    paddingHorizontal: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  verifiedBadge: {
    marginTop: 2,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  hashtag: {
    fontWeight: 'bold',
  },
  productCarouselContainer: {
    width: width,
  },
  productCardWrapper: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff1a',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#333',
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  cardProductTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardPrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardOldPrice: {
    color: '#aaa',
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#ccc',
    fontSize: 11,
  },
  viewButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 8,
  },
  viewButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#000',
    fontWeight: '600',
  },
  createButton: {
    marginBottom: 8,
    width: 45,
    height: 30,
    backgroundColor: '#000',
    borderRadius: 8, 
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#20D6E6',
    borderRightWidth: 3,
    borderRightColor: '#FF2E5B',
  },
  loadingContainer: {
    height: height,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 97, // Cleanly above nav bar
    left: 0,
    right: 0,
    height: 3, // Sleek touch area
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Light color for remaining part
    justifyContent: 'center',
    zIndex: 9999,
  },
  progressBarActive: {
    height: 3, // Very sleek white line
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
});