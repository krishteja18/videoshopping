import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import { useFocusEffect, useRouter } from 'expo-router'; // Added useFocusEffect
import React, { useCallback, useEffect, useState } from 'react'; // Added useCallback
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');
const COLUMN_count = 3;
const ITEM_WIDTH = width / COLUMN_count;

interface ProfileViewProps {
  userId?: string; 
  onSignOut?: () => void;
}

export default function ProfileView({ userId, onSignOut }: ProfileViewProps) {
  const router = useRouter();
  const { profile: currentUser, isLoading: isCurrentUserLoading, fetchProfile: fetchCurrentUser } = useUserStore();
  
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'uploads' | 'likes'>('uploads');
  const [videos, setVideos] = useState<any[]>([]);
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // Video loading
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isOwnProfile = !userId || (currentUser && currentUser.id === userId);
  const profile = isOwnProfile ? currentUser : otherProfile;

  // Added useFocusEffect to refresh profile
  useFocusEffect(
    useCallback(() => { 
        if (isOwnProfile) {
           // Ensure we have latest data
           fetchCurrentUser();
        }
    }, [isOwnProfile])
  );

  useEffect(() => {
    loadProfile();
  }, [userId]); // Removed currentUser from dep array as it's handled by derived state

  useEffect(() => {
    if (profile?.id) {
       checkIfFollowing();
       fetchCounts();
       fetchVideos();
    }
  }, [profile?.id, activeTab]);

  const loadProfile = async () => {
    if (isOwnProfile) {
        if (!currentUser) fetchCurrentUser();
    } else {
        // Fetch other user profile
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) throw error;
            setOtherProfile(data);
        } catch (error) {
            console.log('Error fetching user profile:', error);
        }
    }
  };

  const checkIfFollowing = async () => {
    if (isOwnProfile || !currentUser) return;
    try {
        const { data, error } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('following_id', profile.id)
            .maybeSingle(); // Use maybeSingle to avoid error if not found
        
        if (error && error.code !== 'PGRST116') throw error;
        setIsFollowing(!!data);
    } catch (error) {
        console.log('Error checking follow status:', error);
    }
  };

  const fetchCounts = async () => {
      if (!profile?.id) return;
      // Fetch Followers count
      const { count: followers } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profile.id);
      setFollowersCount(followers || 0);

      // Fetch Following count
      const { count: following } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profile.id);
      setFollowingCount(following || 0);
  };

  const fetchVideos = async () => {
      if (!profile?.id) return;
      if (activeTab === 'uploads') {
          fetchUserVideos();
      } else {
          fetchLikedVideos();
      }
  };

  const fetchUserVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          video_products (
            products (
              image_url
            )
          )
        `)
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      console.log('Error fetching user videos:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLikedVideos = async () => {
    setLoading(true);
    try {
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', profile.id);

      if (likesError) throw likesError;

      if (likes && likes.length > 0) {
        const videoIds = likes.map(l => l.video_id);
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select(`
            *,
            video_products (
              products (
                image_url
              )
            ),
            profiles!videos_seller_id_fkey (
                username,
                avatar_url
            )
          `)
          .in('id', videoIds)
          .order('created_at', { ascending: false });

        if (videosError) throw videosError;
        setLikedVideos(videosData || []);
      } else {
        setLikedVideos([]);
      }
    } catch (error: any) {
      console.log('Error fetching likes:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleFollow = async () => {
      if (!currentUser) return; // Should redirect to login?

      // Optimistic update
      const newStatus = !isFollowing;
      setIsFollowing(newStatus);
      setFollowersCount(prev => newStatus ? prev + 1 : prev - 1);

      try {
          if (newStatus) {
              // Follow
              const { error } = await supabase
                  .from('follows')
                  .insert({
                      follower_id: currentUser.id,
                      following_id: profile.id
                  });
              if (error) throw error;
          } else {
              // Unfollow
              const { error } = await supabase
                  .from('follows')
                  .delete()
                  .eq('follower_id', currentUser.id)
                  .eq('following_id', profile.id);
              if (error) throw error;
          }
      } catch (error) {
          console.log('Error toggling follow:', error);
          // Revert on error
          setIsFollowing(!newStatus);
          setFollowersCount(prev => !newStatus ? prev + 1 : prev - 1);
          Alert.alert('Error', 'Failed to update follow status');
      }
  };

  const handleBecomeSeller = async () => {
      // ... (existing logic, maybe refactor to use updateProfile from store?)
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (!isOwnProfile) loadProfile(); // Reload other profile
    else fetchCurrentUser(); // Reload own profile
    
    fetchCounts();
    fetchVideos();
  };

  const renderVideoItem = ({ item }: { item: any }) => {
    const thumbnail = item.video_products?.[0]?.products?.image_url || 'https://via.placeholder.com/150';
    
    return (
      <TouchableOpacity 
        style={styles.gridItem}
        onPress={() => router.push({
            pathname: '/video/[id]',
            params: { 
                id: item.id,
                videoUrl: item.video_url,
                thumbnail: thumbnail,
                username: profile?.username || 'user',
                avatar: profile?.avatar_url,
                description: item.description,
                likes: item.likes_count,
                comments: item.comments_count,
                sellerId: item.seller_id // Pass sellerId if available on item
             }
        })}
      >
        <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.viewsOverlay}>
            <Icon name="play" size={12} color="#fff" />
            <Text style={styles.viewsText}>{(item.views_count || 0)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
        <View style={styles.profileHeader}>
            <Image 
            source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }} 
            style={styles.avatar} 
            />
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{videos.length}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{followersCount}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{followingCount}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </View>
            </View>
        </View>
        
        <View style={styles.bioContainer}>
            <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.username}>@{profile?.username || 'username'}</Text>
            {profile?.role === 'seller' && (
                <View style={styles.sellerBadge}>
                    <Text style={styles.sellerText}>SELLER</Text>
                </View>
            )}
            {profile?.bio && <Text style={styles.bioText}>{profile.bio}</Text>}
            {profile?.website && <Text style={styles.websiteText}>{profile.website}</Text>}
        </View>

        <View style={styles.actions}>
            {isOwnProfile ? (
                 <>
                    <TouchableOpacity 
                        style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]} 
                        onPress={() => router.push('/profile/edit')}
                    >
                        <Text style={styles.secondaryButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    {profile?.role === 'seller' ? (
                        <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginLeft: 8 }]} onPress={() => router.push('/upload')}>
                            <Text style={styles.primaryButtonText}>Upload</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginLeft: 8 }]} onPress={handleBecomeSeller}>
                            <Text style={styles.primaryButtonText}>Become Seller</Text>
                        </TouchableOpacity>
                    )}
                 </>
            ) : (
                <>
                    <TouchableOpacity 
                        style={[
                            styles.primaryButton, 
                            { flex: 1, marginRight: 8, backgroundColor: isFollowing ? '#333' : '#fff' }
                        ]} 
                        onPress={toggleFollow}
                    >
                        <Text style={[
                            styles.primaryButtonText, 
                            { color: isFollowing ? '#fff' : '#000' }
                        ]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.secondaryButton, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.secondaryButtonText}>Message</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
        
        {isOwnProfile && onSignOut && (
            <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'uploads' && styles.activeTab]} 
                onPress={() => setActiveTab('uploads')}
            >
                <Icon name="grid" size={24} color={activeTab === 'uploads' ? '#fff' : '#666'} />
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'likes' && styles.activeTab]} 
                onPress={() => setActiveTab('likes')}
            >
                <Icon name="heart" size={24} color={activeTab === 'likes' ? '#fff' : '#666'} />
            </TouchableOpacity>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={activeTab === 'uploads' ? videos : likedVideos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        contentContainerStyle={{ paddingBottom: 20 }}
        columnWrapperStyle={{ gap: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <Icon name={activeTab === 'uploads' ? "video" : "heart"} size={48} color="#333" />
                    <Text style={styles.emptyText}>
                        {activeTab === 'uploads' ? 'No videos yet' : 'No liked videos yet'}
                    </Text>
                </View>
            ) : (
                <View style={{ padding: 40 }}>
                    <ActivityIndicator color="#fff" />
                </View>
            )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#333',
    marginRight: 20,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
  },
  bioContainer: {
    marginBottom: 20,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: '#ccc',
    fontSize: 14,
  },
  bioText: {
    color: '#fff', 
    marginTop: 4,
    fontSize: 14
  },
  websiteText: {
     color: '#20D6E6',
     marginTop: 2,
     fontSize: 14 
  },
  sellerBadge: {
    backgroundColor: '#FF2E5B',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  sellerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  signOutButton: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#fff',
  },
  gridItem: {
    width: ITEM_WIDTH - 1,
    height: ITEM_WIDTH * 1.5, // 2:3 aspect ratio
    marginBottom: 1,
    backgroundColor: '#111',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  viewsOverlay: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    fontSize: 16,
  },
});
