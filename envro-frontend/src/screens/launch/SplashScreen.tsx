import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, shadows, typography } from '../../constants';

const DASH_COLOR = '#059669';

const { width, height } = Dimensions.get('window');

const features = [
  { icon: 'camera-outline', label: 'Report Hazards' },
  { icon: 'location-outline', label: 'Share GPS Location' },
  { icon: 'notifications-outline', label: 'Track Report Progress' },
];

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const leafOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = features.map(() => useRef(new Animated.Value(0)).current);
  const cardSlide = features.map(() => useRef(new Animated.Value(40)).current);
  const dash1 = useRef(new Animated.Value(0)).current;
  const dash2 = useRef(new Animated.Value(0)).current;
  const dash3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(leafOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 50 }),
      ]),
      Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.stagger(200, [
        Animated.parallel([
          Animated.timing(cardOpacity[0], { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(cardSlide[0], { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(cardOpacity[1], { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(cardSlide[1], { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(cardOpacity[2], { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(cardSlide[2], { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    const third = 10000 / 3;
    Animated.sequence([
      Animated.timing(dash1, { toValue: 1, duration: third, useNativeDriver: false }),
      Animated.timing(dash2, { toValue: 1, duration: third, useNativeDriver: false }),
      Animated.timing(dash3, { toValue: 1, duration: third, useNativeDriver: false }),
    ]).start();

    const timer = setTimeout(onComplete, 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../../proposed-assets/splash-image-tr.png')}
        style={[styles.imageTopRight, { opacity: Animated.multiply(leafOpacity, 0.35) }]}
        resizeMode="contain"
        blurRadius={0.3}
      />
      <Animated.Image
        source={require('../../../proposed-assets/splash-image-bl.png')}
        style={[styles.imageBottomLeft, { opacity: Animated.multiply(leafOpacity, 0.35) }]}
        resizeMode="contain"
        blurRadius={0.3}
      />

      <View style={styles.centerContent}>
        <Animated.Image
          source={require('../../../proposed-assets/EnviroGuardIcon.png')}
          style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
          resizeMode="contain"
        />

        <Animated.View style={{ opacity: titleOpacity, flexDirection: 'row' }}>
          <Text style={styles.titleGreen}>Enviro</Text>
          <Text style={styles.titleBlack}>Guard</Text>
        </Animated.View>

        <Animated.View style={{ opacity: subtitleOpacity }}>
          <Text style={styles.subtitle}>
            Report environmental hazards around your campus.
          </Text>
        </Animated.View>

        <View style={styles.featureList}>
          {features.map((feature, i) => (
            <Animated.View
              key={i}
              style={[
                styles.featureCard,
                {
                  opacity: cardOpacity[i],
                  transform: [{ translateY: cardSlide[i] }],
                },
              ]}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={22} color="#059669" />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={styles.dashRow}>
          <View style={styles.dashTrack}>
            <Animated.View
              style={[
                styles.dashFill,
                {
                  width: dash1.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.dashTrack}>
            <Animated.View
              style={[
                styles.dashFill,
                {
                  width: dash2.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.dashTrack}>
            <Animated.View
              style={[
                styles.dashFill,
                {
                  width: dash3.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageTopRight: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: width * 0.4,
    height: height * 0.2,
  },
  imageBottomLeft: {
    position: 'absolute',
    bottom: -20,
    left: -30,
    width: width * 0.4,
    height: height * 0.2,
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.lg,
  },
  titleGreen: {
    ...typography.h1,
    color: '#059669',
    fontSize: 36,
    letterSpacing: -0.5,
  },
  titleBlack: {
    ...typography.h1,
    color: '#1F2937',
    fontSize: 36,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  featureList: {
    marginTop: spacing.xl,
    width: width - spacing.lg * 2,
    maxWidth: 340,
    gap: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureLabel: {
    ...typography.body,
    color: '#1F2937',
    fontWeight: '600',
  },
  dashRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xxl,
  },
  dashTrack: {
    width: (width - spacing.lg * 2 - 12) / 3,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  dashFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: DASH_COLOR,
  },
});