
import { useAlert } from '@/context/AlertContext';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

const AlertBanner = () => {
  const { alert, hideAlert } = useAlert();
  const insets = useSafeAreaInsets();

  if (!alert.visible) return null;

  const getStyles = () => {
    switch (alert.type) {
      case 'success':
        return { bg: '#E3F9E5', border: '#C1EAC5', text: '#1F7A1F', icon: 'check-circle' };
      case 'error':
        return { bg: '#FFEBEB', border: '#FFC1C1', text: '#CC0000', icon: 'alert-circle' };
      default:
        return { bg: '#EBF5FF', border: '#C1DFFF', text: '#0052CC', icon: 'info' };
    }
  };

  const styleConfig = getStyles();

  return (
    <Animated.View 
      entering={SlideInUp.springify().damping(15)} 
      exiting={SlideOutUp}
      style={[
        styles.container, 
        { top: insets.top + 10,  backgroundColor: styleConfig.bg, borderColor: styleConfig.border }
      ]}
    >
      <Icon name={styleConfig.icon} size={24} color={styleConfig.text} style={styles.icon} />
      <Text style={[styles.message, { color: styleConfig.text }]}>{alert.message}</Text>
      <TouchableOpacity onPress={hideAlert} style={styles.closeBtn}>
        <Icon name="x" size={18} color={styleConfig.text} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  }
});

export default AlertBanner;
