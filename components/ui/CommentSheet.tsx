import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommentSheetProps {
  videoId: string | null;
  visible: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  inline?: boolean;
}

export const CommentSheet = ({ videoId, visible, onClose, onCommentAdded, inline }: CommentSheetProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const { profile } = useUserStore();

  useEffect(() => {
    if (visible && videoId) {
      fetchComments();
    }
  }, [visible, videoId]);

  const fetchComments = async () => {
    if (!videoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        text,
        created_at,
        user:profiles (
          username,
          avatar_url
        )
      `)
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data as any || []);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newComment.trim() || !videoId) return;
    
    // Ensure user is loaded
    const currentUserId = profile?.id || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) {
        console.error("User not found for comment");
        return;
    }

    setSending(true);
    const text = newComment.trim();
    setNewComment(''); // Optimistic clear
    Keyboard.dismiss();

    const { error } = await supabase
      .from('comments')
      .insert({
        video_id: videoId,
        user_id: currentUserId,
        text: text
      });

    if (error) {
      console.error('Error sending comment:', error);
      setNewComment(text); // Restore text on error
    } else {
      fetchComments(); // Refresh list
      onCommentAdded?.();
    }
    setSending(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const renderContent = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{comments.length} Comments</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.commentItem}>
              <Image 
                source={{ uri: item.user?.avatar_url || 'https://via.placeholder.com/40' }} 
                style={styles.avatar} 
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.username}>{item.user?.username || 'User'}</Text>
                  <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                </View>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor="#999"
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!newComment.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // Inline mode: render directly without Modal
  if (inline) {
    if (!visible) return null;
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inlineContainer}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    );
  }

  // Modal mode (original behavior)
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  inlineContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerTitleDark: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  usernameDark: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ccc',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  commentTextDark: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    marginBottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 10,
  },
  inputContainerDark: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1a1a1a',
    marginBottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#000',
  },
  inputDark: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#fff',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3897f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  emptyTextDark: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
