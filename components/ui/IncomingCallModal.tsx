import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface IncomingCallModalProps {
  visible: boolean;
  callData: any;
  onClose: () => void;
}

export default function IncomingCallModal({ visible, callData, onClose }: IncomingCallModalProps) {
  const router = useRouter();

  if (!callData) return null;

  const handleAccept = async () => {
    try {
      await supabase
        .from('video_calls')
        .update({ status: 'accepted', started_at: new Date().toISOString() })
        .eq('id', callData.id);
      
      onClose();
      router.push({
        pathname: '/live-call',
        params: { callId: callData.id }
      } as any);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleReject = async () => {
    try {
      await supabase
        .from('video_calls')
        .update({ status: 'rejected' })
        .eq('id', callData.id);
      onClose();
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={90} tint="dark" style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Incoming Video Call</Text>
          
          <View style={styles.userContainer}>
            <Image 
              source={{ uri: callData.buyer?.avatar_url || 'https://via.placeholder.com/100' }} 
              style={styles.avatar} 
            />
            <Text style={styles.username}>{callData.buyer?.full_name || 'Buyer'}</Text>
            <Text style={styles.subtitle}>wants to start a live shopping session</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleReject}>
              <Ionicons name="close" size={32} color="#fff" />
              <Text style={styles.buttonLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAccept}>
              <Ionicons name="videocam" size={32} color="#fff" />
              <Text style={styles.buttonLabel}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  userContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
  acceptButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#34C759',
  },
  rejectButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF3B30',
  },
});
