import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Image, Dimensions } from 'react-native';
import { spacing, typography } from '../../constants';

const { width, height } = Dimensions.get('window');

export default function SessionScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../../proposed-assets/splash-image-tr.png")}
        style={[
          styles.leafTopLeft,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            }),
          },
        ]}
        resizeMode="contain"
      />
      <Animated.Image
        source={require("../../../proposed-assets/splash-image-bl.png")}
        style={[
          styles.leafBottomRight,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            }),
          },
        ]}
        resizeMode="contain"
      />

      <Animated.View style={[styles.topSection, { opacity: fadeAnim }]}>
        <Image
          source={require("../../../proposed-assets/EnviroGuardIcon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}> 
        <Text style={styles.loadingText}>Checking your session...</Text>
        <ActivityIndicator size="large" color="#059669" style={styles.loader} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  leafTopLeft: {
    position: 'absolute',
    top: -30,
    left: -40,
    width: width * 0.5,
    height: height * 0.25,
  },
  leafBottomRight: {
    position: 'absolute',
    bottom: -30,
    right: -40,
    width: width * 0.5,
    height: height * 0.25,
    transform: [{ rotate: '180deg' }],
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: height * 0.08,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.md,
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: height * 0.1,
    marginTop: -spacing.xl,
  },
  loadingText: {
    ...typography.bodySmall,
    color: '#9CA3AF',
    marginBottom: spacing.sm,
  },
  loader: {
    marginTop: spacing.xs,
  },
});