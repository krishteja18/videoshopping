import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import { Octicons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window');

export default function SingleVideoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const { profile } = useUserStore();
  
  // Initialize with params if available
  const [video, setVideo] = useState<any>(
    params.videoUrl ? {
      id: params.id,
      videoUrl: params.videoUrl,
      avatar: params.avatar,
      username: params.username,
      description: params.description,
      likes: params.likes,
      comments: params.comments,
      thumbnail: params.thumbnail,
    } : null
  );
  
  const [loading, setLoading] = useState(!params.videoUrl); 
  const [videoLoading, setVideoLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<Video>(null);

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

  useEffect(() => {
    ensureAudio();
    fetchVideo();
  }, [id]);

  const ensureAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.log('Error setting audio mode:', e);
    }
  };

  const fetchVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          video_products (
            products (
              id,
              title,
              price,
              original_price,
              image_url
            )
          ),
          seller:profiles!videos_seller_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Format 
      const formattedVideo = {
        id: data.id,
        sellerId: data.seller_id,
        videoUrl: data.video_url,
        description: data.description,
        username: '@' + (data.seller?.username || 'user'),
        avatar: data.seller?.avatar_url,
        likes: data.likes_count || 0,
        comments: data.comments_count || 0,
        shares: data.shares_count || 0,
        isLiked: false, 
        products: data.video_products?.map((vp: any) => ({
             id: vp.products.id,
             title: vp.products.title,
             price: `₹${vp.products.price}`,
             originalPrice: vp.products.original_price ? `₹${vp.products.original_price}` : null,
             image: vp.products.image_url,
        })) || []
      };

      setVideo(formattedVideo);
    } catch (error) {
      console.log('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoubleTapLike = () => {
    const rotation = (Math.random() * 30 - 15) + 'deg';
    heartRotate.value = rotation;
    heartScale.value = 0;
    heartScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 200, mass: 0.5 }),
      withDelay(100, withSpring(1, { damping: 12, stiffness: 150 })), 
      withDelay(500, withTiming(0, { duration: 250 }))
    );
  };

  const lastTap = useRef<number>(0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {loading ? (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : video ? (
        <>
            <Video
                ref={videoRef}
                source={{ uri: video.videoUrl }}
                style={styles.backgroundVideo}
                resizeMode={ResizeMode.COVER}
                isLooping={true}
                shouldPlay={true}
                isMuted={muted}
                onLoadStart={() => setVideoLoading(true)}
                onLoad={() => setVideoLoading(false)}
                onError={(e) => {
                    console.log('Video error:', e);
                    setVideoLoading(false);
                }}
            />
            
            {videoLoading && (
                <View style={[styles.loadingContainer, StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}

            {/* Touch Layer for Mute/Like */}
            <Pressable 
                style={styles.touchLayer}
                onPress={() => {
                const now = Date.now();
                if (now - lastTap.current < 300) {
                    handleDoubleTapLike();
                } else {
                    setMuted(!muted);
                }
                lastTap.current = now;
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

            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradientOverlay}
                pointerEvents="none"
            />

            {/* Right Actions */}
            <View style={styles.rightActions}>
                <View style={styles.actionButton}>
                <Octicons name="heart" size={24} color="#fff" />
                <Text style={styles.actionCount}>{video.likes}</Text>
                </View>
                <View style={styles.actionButton}>
                <Icon name="message-circle" size={24} color="#fff" />
                <Text style={styles.actionCount}>{video.comments}</Text>
                </View>
            </View>

            {/* Bottom info */}
            <View style={styles.bottomInfoContainer}>
                <TouchableOpacity 
                    style={styles.userRow}
                    onPress={() => {
                        if (video.sellerId) {
                            router.push(`/profile/${video.sellerId}`);
                        }
                    }}
                >
                    <Image source={{ uri: video.avatar || 'https://via.placeholder.com/50' }} style={styles.avatar} />
                    <Text style={styles.username}>{video.username}</Text>
                </TouchableOpacity>
                <Text style={styles.description} numberOfLines={2}>{video.description}</Text>
            </View>
        </>
      ) : (
        <View style={styles.loadingContainer}>
            <Text style={{ color: '#fff' }}>Video not found</Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: '#aaa' }}>Go Back</Text>
            </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  touchLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  muteBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 30,
  },
  heartOverlay: {
    position: 'absolute',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 2,
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    zIndex: 10,
    alignItems: 'center',
  },
  actionButton: {
    marginBottom: 20,
    alignItems: 'center',
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Nunito-SemiBold',
  },
  bottomInfoContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 80,
    zIndex: 5,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
  },
  description: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
});
