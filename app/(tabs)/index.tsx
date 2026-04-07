import ProfileView from '@/components/ProfileView';
import { CommentSheet } from '@/components/ui/CommentSheet';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store/useCartStore';
import { useSearchStore, useUserStore } from '@/store/useStore';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import Octicons from '@expo/vector-icons/Octicons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect } from '@react-navigation/native';
import { Audio, ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, GestureResponderEvent, Image, PanResponder, Pressable, RefreshControl, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
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
        price: '₹299/lb', // Converted roughly for context
        originalPrice: '₹399',
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
        price: '₹7,499',
        originalPrice: '₹10,999',
        rating: '4.8 (2.3k)',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop'
      }
    ]
  }
];

const ProductCarousel = ({ products }: { products: any[] }) => {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const { addItem } = useCartStore();

  const handleAddToCart = (product: any) => {
    // Parse price string "₹7,499" to number
    const priceNumber = typeof product.price === 'string' 
      ? parseInt(product.price.replace(/[^0-9]/g, ''), 10)
      : product.price;
    
    addItem({
      id: String(product.id),
      title: product.title,
      price: priceNumber,
      image: product.image,
      sellerId: '' 
    });
    Alert.alert('Added to Cart', `${product.title} added to your cart.`);
  };

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
                    <Text style={styles.ratingText}>{product.rating?.split(' ')[0]}</Text>
                    <FontAwesome name="star" size={12} color="#FFD700" style={{ marginHorizontal: 4 }} />
                    <Text style={[styles.ratingText, { opacity: 0.7 }]}>{product.rating?.split(' ').slice(1).join(' ')}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    style={[styles.viewButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={() => router.push(`/product/${product.id}`)}
                  >
                    <Text style={[styles.viewButtonText, { color: '#fff' }]}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.viewButton}
                    onPress={() => handleAddToCart(product)}
                  >
                    <Text style={styles.viewButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
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

const VideoItem = ({ item, index, currentIndex, muted, setMuted, videoRefs, ensureAudio, onVideoFinished, hideOverlay, onCall }: any) => {
  const [progress, setProgress] = useState(0);
  const isScrubbing = useRef(false);
  const duration = useRef(0);
  const localVideoRef = useRef<Video | null>(null);

  // Memoize source to prevent unnecessary reloads
  const videoSource = useMemo(() => ({ uri: item.videoUrl }), [item.videoUrl]);

  // Heart Animation
  const heartScale = useSharedValue(0);
  const heartRotate = useSharedValue('0deg');
  
  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: Math.max(heartScale.value, 0) },
      { rotate: heartRotate.value }
    ],
    opacity: heartScale.value,
  }));

  const handleDoubleTapLike = () => {
    // Random rotation for variety (-15deg to +15deg)
    const rotation = (Math.random() * 30 - 15) + 'deg';
    heartRotate.value = rotation;

    // Reset scale to 0 instantly if re-triggering (or close to 0)
    heartScale.value = 0;

    // Animate: Pop In -> Wait -> Fade Out
    heartScale.value = withSequence(
      withSpring(1.2, { // Overshoot slightly
        damping: 10,
        stiffness: 200, 
        mass: 0.5 
      }),
      withDelay(100, withSpring(1, { // Settle back to 1
         damping: 12,
         stiffness: 150
      })), 
      withDelay(500, withTiming(0, { duration: 250 })) // Fade out smoothly
    );
    
    // Trigger like if not already liked (or simply pass the action)
    if (!item.isLiked) {
        item.onLike();
    }
  };

  useEffect(() => {
    if (index === currentIndex && localVideoRef.current) {
        // If we just scrolled to this video, replay it from start
        localVideoRef.current.replayAsync();
    }
  }, [currentIndex, index]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
          onVideoFinished(index);
          return;
      }
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

  const toggleMute = useCallback(() => {
    setMuted((m: boolean) => !m);
  }, []);

  const lastTap = useRef<number>(0);
  const singleTapTimeout = useRef<any>(null);

  useEffect(() => {
    return () => {
        if (singleTapTimeout.current) clearTimeout(singleTapTimeout.current);
    }
  }, []);

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
        isLooping={false}
        shouldPlay={index === currentIndex}
        isMuted={muted}
        onLoadStart={ensureAudio}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        progressUpdateIntervalMillis={100}
        onError={(e) => console.log('Video error:', e)}
      />


      {!hideOverlay && (
      <>
      <Pressable 
        style={styles.videoTouchLayer}
        onPress={() => {
          const now = Date.now();
          const DOUBLE_PRESS_DELAY = 400;
          if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
            console.log('Double tap detected!');
            if (singleTapTimeout.current) {
                clearTimeout(singleTapTimeout.current);
                singleTapTimeout.current = null;
            }
            handleDoubleTapLike();
            lastTap.current = 0; // Reset
          } else {
            lastTap.current = now;
            singleTapTimeout.current = setTimeout(() => {
                toggleMute();
                singleTapTimeout.current = null;
                lastTap.current = 0; // Reset after single tap action too? No, keep it.
            }, DOUBLE_PRESS_DELAY);
          }
        }}
      >
          {!muted && (
             <View style={styles.muteBadge}>
               <Octicons name="unmute" size={20} color="#fff" />
             </View>
          )}
          
          <Animated.View style={[styles.heartOverlay, heartAnimatedStyle]}>
            <Octicons name="heart-fill" size={80} color="#e31b23" />
          </Animated.View>
      </Pressable>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      <View style={styles.rightActions} pointerEvents="box-none">


        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onCall(item.sellerId)}
        >
          <Octicons name="device-camera-video" size={24} color="#fff" />
          <Text style={styles.actionLabel}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={item.onLike}>
          <Octicons 
            name={item.isLiked ? "heart-fill" : "heart"} 
            size={24} 
            color={item.isLiked ? "#e31b23" : "#fff"} 
          />
          <Text style={styles.actionCount}>{item.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={item.onComment}>
          <Icon name="message-circle" size={24} color="#fff" />
          <Text style={styles.actionCount}>{item.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={item.onShare}>
          <Octicons name="paper-airplane" size={24} color="#fff" />
          <Text style={styles.actionCount}>{item.shares}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomInfoContainer} pointerEvents="box-none">
        <View style={styles.userInfoContainer}>
          <View style={styles.userRow}>
            <Image source={{ uri: item.avatar || 'https://via.placeholder.com/50' }} style={styles.userAvatarSmall} />
            <Text style={styles.username}>{item.username}</Text>
            {/* New Follow Button */}
            <TouchableOpacity style={styles.followButton}>
               <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <Octicons name="verified" size={14} color="#20D6E6" />
              </View>
            )}
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
      </>
      )}
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fetchProfile, profile: currentUser } = useUserStore();
  const { filteredVideos: searchFilteredVideos } = useSearchStore();
  
  const [activeTab, setActiveTab] = useState('home');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilteredMode, setIsFilteredMode] = useState(false);

  // Interaction State
  const [showComments, setShowComments] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const videoRefs = useRef<(Video | null)[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Animation values for Instagram-style video card
  const containerHeight = useSharedValue(height);
  const containerMarginH = useSharedValue(0);
  const containerMarginTop = useSharedValue(0);
  const containerBorderRadius = useSharedValue(0);

  useEffect(() => {
    containerHeight.value = withTiming(showComments ? height * 0.42 : height, { duration: 300 });
    containerMarginH.value = withTiming(showComments ? 48 : 0, { duration: 300 });
    containerMarginTop.value = withTiming(showComments ? 8 : 0, { duration: 300 });
    containerBorderRadius.value = withTiming(showComments ? 24 : 0, { duration: 300 });
  }, [showComments]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: containerHeight.value,
    marginHorizontal: containerMarginH.value,
    marginTop: containerMarginTop.value,
    borderRadius: containerBorderRadius.value,
    overflow: 'hidden' as const,
  }));

  const handleVideoFinished = (finishedIndex: number) => {
    if (finishedIndex < videos.length - 1) {
        flatListRef.current?.scrollToIndex({ index: finishedIndex + 1, animated: true });
    } else {
        // Optional: Replay the last video or just stop
        videoRefs.current[finishedIndex]?.replayAsync();
    }
  };

  // Sync profile changes to feed (e.g. if I updated my avatar, update my videos in feed)
  useEffect(() => {
      if (currentUser && videos.length > 0) {
          setVideos(prev => prev.map(v => {
             if (v.sellerId === currentUser.id && v.avatar !== currentUser.avatar_url) {
                 return { ...v, avatar: currentUser.avatar_url };
             }
             return v;
          }));
      }
  }, [currentUser]); // Listen to currentUser updates

  const fetchVideos = async () => {
    try {
      // 1. Fetch Videos with Counts
      const { data: videosData, error } = await supabase
        .from('videos')
        .select(`
          id,
          video_url,
          description,
          created_at,
          likes_count,
          comments_count,
          shares_count,
          seller_id,
          seller:profiles!videos_seller_id_fkey (
            username,
            full_name,
            avatar_url
          ),
          video_products (
            products (
              id,
              title,
              price,
              original_price,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Fetch User Likes to determine 'isLiked' state
      const { data: { user } } = await supabase.auth.getUser();
      const likedVideoIds = new Set();
      if (user) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('video_id')
          .eq('user_id', user.id);
        
        likesData?.forEach(like => likedVideoIds.add(like.video_id));
      }

      if (videosData && videosData.length > 0) {
        const formattedVideos = videosData.map((v: any) => ({
          id: v.id,
          sellerId: v.seller_id,
          username: v.seller?.username ? `@${v.seller.username}` : (v.seller?.full_name || 'Unknown'),
          description: v.description,
          likes: v.likes_count || 0,
          comments: v.comments_count || 0,
          shares: v.shares_count || 0,
          isLiked: likedVideoIds.has(v.id),
          videoUrl: v.video_url,
          avatar: v.seller?.avatar_url,
          products: v.video_products.map((vp: any) => ({
            id: vp.products.id,
            title: vp.products.title,
            price: `₹${vp.products.price}`,
            originalPrice: vp.products.original_price ? `₹${vp.products.original_price}` : undefined,
            rating: '4.8 (1.2k)',
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

  const handleLike = async (videoId: string, currentLiked: boolean) => {
    // Optimistic Update
    setVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return {
          ...v,
          isLiked: !currentLiked,
          likes: currentLiked ? v.likes - 1 : v.likes + 1
        };
      }
      return v;
    }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (currentLiked) {
      // Unlike
      await supabase.from('likes').delete().eq('user_id', user.id).eq('video_id', videoId);
    } else {
      // Like
      await supabase.from('likes').insert({ user_id: user.id, video_id: videoId });
    }
  };

  const handleShare = async (video: any) => {
    try {
      const result = await Share.share({
        message: `Check out this video on SwipeKart! ${video.description} \n\n${video.videoUrl}`,
        url: video.videoUrl, // iOS
        title: 'SwipeKart Video' // Android
      });
      
      if (result.action === Share.sharedAction) {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
             supabase.from('shares').insert({
                 user_id: user.id,
                 video_id: video.id,
                 platform: 'native'
             });
             // Optimistic update
             setVideos(prev => prev.map(v => v.id === video.id ? { ...v, shares: (v.shares || 0) + 1 } : v));
         }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleInitiateCall = async (sellerId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Login Required', 'Please sign in to make a call.');
      return;
    }

    if (user.id === sellerId) {
      Alert.alert('Call Not Possible', 'You cannot call yourself.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('video_calls')
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      router.push({
        pathname: '/live-call',
        params: { callId: data.id }
      } as any);
    } catch (error: any) {
      console.error('Error initiating call:', error);
      Alert.alert('Connection Failed', 'Unable to initiate call. Please try again later.');
    }
  };

  useEffect(() => {
    // Only fetch videos if we're not in filtered mode from search
    if (!params.filteredVideos) {
      fetchVideos();
    }
  }, []);

  // Handle filtered videos from search
  useEffect(() => {
    if (params.filteredVideos && params.startIndex) {
      try {
        const filtered = JSON.parse(params.filteredVideos as string);
        const startIdx = parseInt(params.startIndex as string, 10);
        setVideos(filtered);
        setIsFilteredMode(true);
        setCurrentIndex(startIdx);
        setLoading(false); // Stop loading since we have videos
        // Scroll to the selected video
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: startIdx, animated: false });
        }, 100);
      } catch (error) {
        console.error('Error parsing filtered videos:', error);
      }
    }
  }, [params.filteredVideos, params.startIndex]);

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
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) await GoogleSignin.signOut();
      } catch (e) {}
      await supabase.auth.signOut();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const renderHeader = () => {
    const { getItemCount } = useCartStore();
    const itemCount = getItemCount();

    return (
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.homeSearchBar} 
          activeOpacity={0.8}
          onPress={() => router.push('/search' as any)}
        >
           <Octicons name="search" size={18} color="rgba(255,255,255,0.7)" />
           <Text style={styles.homeSearchText}>Search products, brands and videos</Text>
           <Icon name="mic" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cartHeaderButton}
          onPress={() => router.push('/cart')}
        >
          <BlurView intensity={30} tint="dark" style={styles.cartIconWrapper}>
            <Ionicons name="cart-outline" size={24} color="#fff" />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            )}
          </BlurView>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        {/* Search bar removed - now accessible via bottom nav */}
        {activeTab === 'profile' ? (
          <ProfileView onSignOut={handleSignOut} />
        ) : (
        <View style={{ flex: 1 }}>
        <Animated.View style={animatedStyle}>
        <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <VideoItem 
            item={{
              ...item,
              onLike: () => handleLike(item.id, item.isLiked),
              onShare: () => handleShare(item),
              onComment: () => {
                setActiveVideoId(item.id);
                setShowComments(true);
              }
            }}   
            index={index} 
            currentIndex={currentIndex} 
            muted={muted} 
            setMuted={setMuted} 
            videoRefs={videoRefs}
            ensureAudio={ensureAudio}
            onVideoFinished={handleVideoFinished}
            hideOverlay={showComments}
            onCall={handleInitiateCall}
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
      </Animated.View>

      {/* Inline Comment Sheet - renders below video card */}
      <CommentSheet 
        visible={showComments} 
        videoId={activeVideoId} 
        onClose={() => setShowComments(false)}
        onCommentAdded={() => {
           if (activeVideoId) {
             setVideos(prev => prev.map(v => v.id === activeVideoId ? { ...v, comments: (v.comments || 0) + 1 } : v));
           }
        }}
        inline={true}
      />
      </View>
      )}

      {/* Bottom Navigation */}
      {!showComments && (
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => {
              setActiveTab('home');
              if (isFilteredMode) {
                setIsFilteredMode(false);
                fetchVideos(); // Reload full feed
              }
            }}
          >
            <Octicons name="home" size={24} color="#000" />
            <Text style={[styles.navLabel, activeTab === 'home' ? styles.navLabelActive : styles.navLabelInactive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/search' as any)}>
            <Octicons name={activeTab === 'search' ? "search" : "search"} size={24} color={'#000'} />
             <Text style={[styles.navLabel, styles.navLabelInactive]}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={() => setActiveTab('create')}>
            <Octicons name="plus" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('favorites')}>
            {activeTab === 'favorites' ? (
               <Octicons name="heart-fill" size={24} color="#000" />
            ) : (
               <Octicons name="heart" size={24} color="#000" />
            )}
             <Text style={[styles.navLabel, activeTab === 'favorites' ? styles.navLabelActive : styles.navLabelInactive]}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
            {activeTab === 'profile' ? (
               <Octicons name="person-fill" size={24} color="#000" />
            ) : (
               <Octicons name="person" size={24} color="#000" />
            )}
             <Text style={[styles.navLabel, activeTab === 'profile' ? styles.navLabelActive : styles.navLabelInactive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}
    </SafeAreaView>
  </GestureHandlerRootView>
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
    fontFamily: 'Nunito-Regular',
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
    fontFamily: 'Nunito-SemiBold',
  },
  headerSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginLeft: 10,
  },
  headerSearchBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)', // Darker glass for contrast on video
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
    height: '50%',
    zIndex: 2,
    // backgroundColor removed in favor of LinearGradient
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
    fontFamily: 'Nunito-Medium',
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Nunito-Medium',
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
    fontFamily: 'Nunito-SemiBold',
    marginRight: 8,
  },
  followButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.2)', // Slight contrast
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
  },
  verifiedBadge: {
    marginTop: 2,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Nunito-Regular',
  },
  hashtag: {
    fontFamily: 'Nunito-Medium',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    fontFamily: 'Nunito-Medium',
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
    fontFamily: 'Nunito-SemiBold',
  },
  cardOldPrice: {
    color: '#aaa',
    fontSize: 13,
    textDecorationLine: 'line-through',
    fontFamily: 'Nunito-Regular',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#ccc',
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
  },
  viewButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 8,
  },
  viewButtonText: {
    color: '#000',
    fontSize: 13,
    fontFamily: 'Nunito-SemiBold',
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    marginTop: 4,
    fontFamily: 'Nunito-Medium',
  },
  navLabelInactive: {
    color: '#999',
  },
  navLabelActive: {
    color: '#000',
    fontFamily: 'Nunito-Bold',
  },
  createButton: {
    marginBottom: 8,
    width: 50,
    height: 38,
    backgroundColor: '#000',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingContainer: {
    height: height,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    zIndex: 10, // Ensure it's above other elements but below interactions if needed
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
  homeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Product Card Style
    height: 48,
    width: '85%',
    borderRadius: 30, 
    borderWidth: .5,
    borderColor: '#fff', // Subtle border for product card look
    paddingHorizontal: 16,
  },
  homeSearchText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    marginLeft: 10,
    flex: 1,
    fontFamily: 'Nunito-Regular', 
  },
  cartHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginLeft: 10,
  },
  cartIconWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});