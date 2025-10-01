import { BrandColors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Audio, ResizeMode, Video } from 'expo-av';
import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window');

// Sample video shopping data
const sampleVideos = [
  {
    id: 1,
    username: '@fruitfulfinds',
    product: 'Fresh Organic Apples',
    description: 'Sweet, juicy, and straight from the farm!',
    price: '$2.99/lb',
    likes: '12.2k',
    comments: '1.5k',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=800&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b5bd25fe?w=50&h=50&fit=crop&crop=face'
  },
  {
    id: 2,
    username: '@techdeals',
    product: 'Wireless Headphones',
    description: 'Premium sound quality 🎧',
    price: '$89.99',
    likes: '15.3k',
    comments: '2.1k',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=800&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face'
  },
  {
    id: 3,
    username: '@fashionista',
    product: 'Summer Fashion Collection',
    description: 'Trendy styles for the season! ✨',
    price: '$49.99',
    likes: '8.7k',
    comments: '892',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=800&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face'
  },
  {
    id: 4,
    username: '@homeessentials',
    product: 'Smart Home Gadgets',
    description: 'Make your home smarter! 🏠',
    price: '$129.99',
    likes: '22.1k',
    comments: '3.2k',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=800&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face'
  },
  {
    id: 5,
    username: '@fitnessdeals',
    product: 'Workout Equipment',
    description: 'Get fit at home! 💪',
    price: '$79.99',
    likes: '18.5k',
    comments: '2.8k',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=800&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=50&h=50&fit=crop&crop=face'
  }
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  const videoRefs = useRef<(Video | null)[]>([]);

  // Ensure audio is in playback mode (only once)
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

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.videoContainer}>
      <Video
        ref={(ref) => { videoRefs.current[index] = ref; }}
        source={{ uri: item.videoUrl }}
        style={styles.backgroundVideo}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={index === currentIndex}
        isMuted={muted}
        onLoadStart={ensureAudio}
        onError={(e) => console.log('Video error:', e)}
      />

      {/* Tap layer (no higher zIndex than overlays) */}
      <Pressable
        style={styles.videoTouchLayer}
        onPress={() => setMuted((m) => !m)}
        onLongPress={() => setMuted(false)}
      >
        <View style={styles.muteBadge}>
          <Icon
            name={muted ? 'volume-x' : 'volume-2'}
            size={18}
            color="#fff"
          />
        </View>
      </Pressable>

      <View style={styles.gradientOverlay} />

      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="heart" size={28} color="#fff" />
          <Text style={styles.actionCount}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="message-circle" size={28} color="#fff" />
          <Text style={styles.actionCount}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share" size={28} color="#fff" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.productName}>{item.product}</Text>
        <Text style={styles.productDescription}>{item.description}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
        <TouchableOpacity style={styles.buyButton}>
          <Text style={styles.buyButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleSignOut = async () => {
    console.log('[SignOut] start');
    try {
      const hadPrev = await GoogleSignin.hasPreviousSignIn();
      console.log('[SignOut] hasPreviousSignIn =', hadPrev);

      try {
        await GoogleSignin.signOut();
        console.log('[SignOut] Google signOut OK');
      } catch (gErr: any) {
        console.log('[SignOut] Google signOut error code:', gErr?.code, 'msg:', gErr?.message);
        if (gErr?.code === statusCodes.SIGN_IN_REQUIRED) {
          console.log('[SignOut] No cached Google user – continuing.');
        }
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('[SignOut] Supabase signOut error:', error.message);
      } else {
        console.log('[SignOut] Supabase signOut OK');
      }

      const sessionCheck = await supabase.auth.getSession();
      console.log('[SignOut] Post signOut session:', sessionCheck.data.session);

    } catch (e) {
      console.log('[SignOut] Unexpected wrapper error:', e);
    } 
  };

  const handleTabPress = (tabName: string) => {
    setActiveTab(tabName);
    if (tabName === 'profile') {
      // handleSignOut();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        {/* <TouchableOpacity style={styles.headerIcon}>
          <Icon name="play" size={20} color="#fff" />
        </TouchableOpacity> */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={16} color="#fff" style={styles.searchIcon} />
          <Text style={styles.searchText}>Search</Text>
        </View>
        {/* <TouchableOpacity style={styles.headerIcon}>
          <Icon name="bell" size={20} color="#fff" />
        </TouchableOpacity> */}
      </View>

      {/* Reels Feed */}
      <FlatList
        data={sampleVideos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
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
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />

      {/* Modern Bottom Navigation */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          {['home', 'favorites', 'cart', 'notifications', 'profile'].map((tab) => {
            const iconMap: any = {
              home: 'home',
              favorites: 'heart',
              cart: 'shopping-cart',
              notifications: 'bell',
              profile: 'user',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.navItem, activeTab === tab && styles.activeNavItem]}
                onPress={() => setActiveTab(tab)}
              >
                <Icon
                  name={iconMap[tab]}
                  size={24}
                  color={activeTab === tab ? '#ffffff' : '#333333'}
                  style={styles.navIcon}
                />
              </TouchableOpacity>
            );
          })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerIcon: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
  videoFeed: {
    flex: 1,
  },
  videoContainer: {
    width,
    height,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    zIndex: 0,
  },
  videoTouchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // zIndex lower than overlays
    zIndex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    zIndex: 2,
    // Optional subtle fade:
    // backgroundColor: 'rgba(0,0,0,0.25)'
  },
  rightActions: {
    position: 'absolute',
    right: 15,
    bottom: 200,
    alignItems: 'center',
    zIndex: 3,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 25,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
  },
  cartButton: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  productInfo: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 80,
    zIndex: 3,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  productPrice: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  buyButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modern Bottom Navigation Styles
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingBottom: 10, // Reduced from 20 to 10
    paddingTop: 5, // Reduced from 10 to 5
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 3, // Reduced from 5 to 2
  },
 navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 7, // Make horizontal padding same as vertical for perfect circle
    borderRadius: 25, // Increased border radius to make it circular
    width: 40, // Set fixed width
    height: 40, // Set fixed height to match width
  },
  activeNavItem: {
    backgroundColor: BrandColors.primary, // #F9CF35 (yellow/gold)
  },
  centerNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    opacity: 0.7,
  },
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 6,
    zIndex: 2,
  },
});