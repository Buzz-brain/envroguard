import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../../contexts/NetworkContext';
import { spacing } from '../../constants';

export default function NetworkBanner() {
  const { isConnected, wasOffline, clearReconnected } = useNetwork();
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<'offline' | 'online'>('offline');
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setType('offline');
      setVisible(true);
      animateIn();
    } else if (wasOffline) {
      setType('online');
      setVisible(true);
      animateIn();
      timerRef.current = setTimeout(() => {
        animateOut(() => {
          setVisible(false);
          clearReconnected();
        });
      }, 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isConnected, wasOffline]);

  const animateIn = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
  };

  const animateOut = (cb?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: -60,
      duration: 250,
      useNativeDriver: true,
    }).start(cb);
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        type === 'offline' ? styles.offline : styles.online,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons
        name={type === 'offline' ? 'cloud-offline-outline' : 'cloud-done-outline'}
        size={18}
        color="#FFF"
        style={{ marginRight: 8 }}
      />
      <Text style={styles.text}>
        {type === 'offline'
          ? "You're offline. Some features are unavailable."
          : 'Back online. Refreshing data...'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 20,
  },
  offline: {
    backgroundColor: '#DC2626',
  },
  online: {
    backgroundColor: '#059669',
  },
  text: {
    color: '#FFF',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    flex: 1,
  },
});
