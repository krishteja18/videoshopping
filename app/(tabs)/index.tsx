import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Sample data for social media posts
const samplePosts = [
  {
    id: 1,
    username: '@johndoe',
    content: 'Beautiful sunset today! 🌅',
    likes: 125,
    comments: 23,
    image: 'https://picsum.photos/400/300?random=1'
  },
  {
    id: 2,
    username: '@jane_smith',
    content: 'Coffee and coding ☕️💻',
    likes: 89,
    comments: 12,
    image: 'https://picsum.photos/400/300?random=2'
  },
  {
    id: 3,
    username: '@travel_guru',
    content: 'Mountain adventures! 🏔️',
    likes: 256,
    comments: 45,
    image: 'https://picsum.photos/400/300?random=3'
  }
];

export default function HomeScreen() {
  const handleSignOut = async () => {
    console.log('[SignOut] start');
    let googleDone = false;
    try {
      // Optional quick check
      const hadPrev = await GoogleSignin.hasPreviousSignIn();
      console.log('[SignOut] hasPreviousSignIn =', hadPrev);

      try {
        await GoogleSignin.signOut();
        googleDone = true;
        console.log('[SignOut] Google signOut OK');
      } catch (gErr: any) {
        console.log('[SignOut] Google signOut error code:', gErr?.code, 'msg:', gErr?.message);
        // Common benign: statusCodes.SIGN_IN_REQUIRED (no cached user)
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

      // Double-check session cleared
      const sessionCheck = await supabase.auth.getSession();
      console.log('[SignOut] Post signOut session:', sessionCheck.data.session);

    } catch (e) {
      console.log('[SignOut] Unexpected wrapper error:', e);
    } 
   
  };


   // finally {
    //   // Fallback navigation in case listener did not fire
    //   setTimeout(() => {
    //     console.log('[SignOut] Forcing navigation to welcome');
    //     router.replace('/welcome');
    //   }, 100);
    // }
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>SwipeKart</ThemedText>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.headerButton}>
            <ThemedText style={styles.headerButtonText}>📷</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSignOut}>
            <ThemedText style={styles.headerButtonText}>🚪</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Feed */}
      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {samplePosts.map((post) => (
          <ThemedView key={post.id} style={styles.postContainer}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.username[1].toUpperCase()}</Text>
              </View>
              <ThemedText style={styles.username}>{post.username}</ThemedText>
            </View>

            {/* Post Image */}
            <Image
              source={{ uri: post.image }}
              style={styles.postImage}
              contentFit="cover"
            />

            {/* Post Actions */}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>❤️</Text>
                <ThemedText style={styles.actionText}>{post.likes}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <ThemedText style={styles.actionText}>{post.comments}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>📤</Text>
              </TouchableOpacity>
            </View>

            {/* Post Content */}
            <ThemedText style={styles.postContent}>{post.content}</ThemedText>
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 20,
  },
  feed: {
    flex: 1,
  },
  postContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  postContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    fontSize: 14,
    lineHeight: 20,
  },
});
