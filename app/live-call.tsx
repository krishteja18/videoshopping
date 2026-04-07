import LiveProductAddModal from '@/components/LiveProductAddModal';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function LiveCallScreen() {
  const { callId } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useUserStore();
  const { addItem, getItemCount } = useCartStore();
  const [callData, setCallData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const isSeller = profile?.id === callData?.seller_id;

  useEffect(() => {
    if (callId) {
      fetchCallData();
      subscribeToCall();
    }
  }, [callId]);

  useEffect(() => {
    if (isSeller && callData) {
      fetchSellerProducts();
    }
  }, [isSeller, callData]);

  const fetchSellerProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', callData.seller_id)
      .limit(10);
    if (data) setSellerProducts(data);
  };

  const fetchCallData = async () => {
    try {
      const { data, error } = await supabase
        .from('video_calls')
        .select(`
          *,
          seller:profiles!video_calls_seller_id_fkey (
            full_name,
            avatar_url
          ),
          buyer:profiles!video_calls_buyer_id_fkey (
            full_name
          )
        `)
        .eq('id', callId)
        .single();

      if (error) throw error;
      setCallData(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load call details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const subscribeToCall = () => {
    const channel = supabase
      .channel(`call:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_calls',
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          setCallData((prev: any) => ({ ...prev, ...payload.new }));
          
          if (payload.new.metadata?.active_product_id) {
             fetchActiveProduct(payload.new.metadata.active_product_id);
          }

          if (payload.new.status === 'rejected') {
            Alert.alert('Call Rejected', 'The seller is currently unavailable.');
            router.back();
          } else if (payload.new.status === 'ended') {
            router.back();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchActiveProduct = async (productId: string) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    if (data) setActiveProduct(data);
  };

  const handlePushProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('video_calls')
        .update({
          metadata: { 
            ...(callData.metadata || {}),
            active_product_id: productId 
          }
        })
        .eq('id', callId);
      
      if (error) throw error;
      Alert.alert('Product Shared', 'The product has been shared with the buyer.');
    } catch (error) {
      console.error('Error pushing product:', error);
    }
  };

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image_url,
      sellerId: product.seller_id
    });
    Alert.alert('Added to Cart', `${product.title} added.`);
  };

  const handleBuyNow = (product: any) => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image_url,
      sellerId: product.seller_id
    });
    router.push('/checkout');
  };

  const handleEndCall = async () => {
    if (!callId) return;
    await supabase
      .from('video_calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', callId);
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.statusText}>Connecting...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoPlaceholder}>
        <Text style={styles.placeholderText}>
          {callData?.status === 'pending' 
            ? `Calling ${callData?.seller?.full_name || 'Seller'}...` 
            : 'Video Stream will appear here'}
        </Text>
      </View>

      {/* Control Bar */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={() => {}}>
          <Ionicons name="mic-outline" size={28} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.endCallButton]} 
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={() => {}}>
          <Ionicons name="videocam-outline" size={28} color="#fff" />
        </TouchableOpacity>

        {isSeller && (
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#FFD700' }]} 
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={28} color="#000" />
          </TouchableOpacity>
        )}

        {!isSeller && (
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.4)' }]} 
            onPress={() => router.push('/cart')}
          >
            <Ionicons name="cart" size={28} color="#fff" />
            {getItemCount() > 0 && (
              <View style={styles.cartBadgeSmall}>
                <Text style={styles.cartBadgeTextSmall}>{getItemCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Product Drawer */}
      <View style={styles.productDrawer}>
         <Text style={styles.drawerTitle}>{isSeller ? 'Your Products' : 'Featured Products'}</Text>
         <FlatList
           data={isSeller ? sellerProducts : (activeProduct ? [activeProduct] : [])}
           horizontal
           showsHorizontalScrollIndicator={false}
           keyExtractor={(item) => item.id}
           renderItem={({ item }) => (
             <TouchableOpacity 
               style={styles.productCard}
               onPress={() => isSeller ? handlePushProduct(item.id) : router.push(`/product/${item.id}`)}
             >
               <Image source={{ uri: item.image_url }} style={styles.productImage} />
               <View style={styles.productInfo}>
                 <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                 <Text style={styles.productPrice}>₹{item.price}</Text>
               </View>
               {isSeller && (
                 <View style={styles.pushBadge}>
                    <Text style={styles.pushBadgeText}>Push</Text>
                 </View>
               )}
             </TouchableOpacity>
           )}
           ListEmptyComponent={
             <Text style={styles.emptyText}>
               {isSeller ? 'Add products to share them' : 'Waiting for seller to share products...'}
             </Text>
           }
         />
      </View>

      {/* Buyer's Live Offer Popup */}
      {!isSeller && activeProduct && (
        <View style={styles.offerPopupWrapper}>
          <BlurView intensity={100} tint="dark" style={styles.offerPopup}>
            <View style={styles.offerHeader}>
               <Ionicons name="flash" size={16} color="#FFD700" />
               <Text style={styles.offerHeaderText}>NEW PRODUCT SHARED!</Text>
               <TouchableOpacity onPress={() => setActiveProduct(null)} style={styles.closeOffer}>
                 <Ionicons name="close" size={20} color="#fff" />
               </TouchableOpacity>
            </View>
            <View style={styles.offerContent}>
              <Image source={{ uri: activeProduct.image_url }} style={styles.offerImage} />
              <View style={styles.offerDetails}>
                <Text style={styles.offerTitle}>{activeProduct.title}</Text>
                <Text style={styles.offerPrice}>₹{activeProduct.price}</Text>
                <View style={styles.offerActions}>
                   <TouchableOpacity 
                    style={styles.cartButton}
                    onPress={() => handleAddToCart(activeProduct)}
                   >
                      <Text style={styles.cartButtonText}>Add to Cart</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                    style={styles.buyButton}
                    onPress={() => handleBuyNow(activeProduct)}
                   >
                      <Ionicons name="flash" size={16} color="#000" />
                      <Text style={styles.buyButtonText}>Buy Now</Text>
                   </TouchableOpacity>
                </View>
              </View>
            </View>
          </BlurView>
        </View>
      )}

      <LiveProductAddModal 
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        sellerId={profile?.id || ''}
        onProductCreated={(p) => {
          setSellerProducts([p, ...sellerProducts]);
          handlePushProduct(p.id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  videoPlaceholder: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  placeholderText: {
    color: '#666',
    fontSize: 18,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    transform: [{ rotate: '135deg' }],
  },
  productDrawer: {
    height: 180,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  productCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  productImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 8,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  productPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  pushBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pushBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  offerPopupWrapper: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  offerPopup: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  offerHeader: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offerHeaderText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 6,
    flex: 1,
  },
  closeOffer: {
    padding: 4,
  },
  offerContent: {
    flexDirection: 'row',
    padding: 16,
  },
  offerImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  offerDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  offerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offerPrice: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  offerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cartButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  buyButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  buyButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
