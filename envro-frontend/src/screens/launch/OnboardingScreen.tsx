import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Pressable, Animated, NativeSyntheticEvent, NativeScrollEvent, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { spacing, shadows, typography } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { setItem } from '../../utils/storage';
import { hapticFeedback } from '../../services/HapticService';
import { SoundService } from '../../services/SoundService';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    title: 'Report Instantly',
    description: 'Report environmental hazards in seconds and help keep your campus clean and safe.',
    image: require('../../../proposed-assets/onboarding-image-1.png'),
  },
  {
    title: 'Share with Accuracy',
    description: 'Upload photos and share your GPS location for faster response.',
    image: require('../../../proposed-assets/onboarding-image-2.png'),
  },
  {
    title: 'Track Every Report',
    description: 'Follow every report from submission to resolution with real-time updates.',
    image: require('../../../proposed-assets/onboarding-image-3.png'),
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const animateIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const finishOnboarding = async () => {
    await setItem('hasCompletedOnboarding', 'true');
    SoundService.success();
    hapticFeedback.success();
    navigation.replace('WelcomeRole');
  };

  const handleSkip = async () => {
    await setItem('hasCompletedOnboarding', 'true');
    SoundService.info();
    hapticFeedback.light();
    navigation.replace('WelcomeRole');
  };

  const handleNext = () => {
    SoundService.info();
    hapticFeedback.selection();
    const nextIndex = Math.min(index + 1, slides.length - 1);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setIndex(nextIndex);
    setTimeout(() => animateIn(), 300);
  };

  const handlePrev = () => {
    const prevIndex = Math.max(index - 1, 0);
    scrollRef.current?.scrollTo({ x: prevIndex * width, animated: true });
    setIndex(prevIndex);
    animateIn();
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.round(offsetX / width);
    setIndex(activeIndex);
    setTimeout(() => animateIn(), 100);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {slides.map((item, slideIndex) => (
          <View key={slideIndex} style={[styles.slide, { width }]}>
            <View style={styles.imageWrap}>
              <Image
                source={item.image}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            <Animated.View
              style={[
                styles.contentBlock,
                slideIndex === index && { opacity: fadeAnim },
              ]}
            >
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
            </Animated.View>

              <View style={styles.navRow}>
              {slideIndex > 0 ? (
                <Pressable onPress={handlePrev} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                  <View style={[styles.navBtn, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
                  </View>
                </Pressable>
              ) : (
                <View style={{ width: 48 }} />
              )}

              <View style={styles.dots}>
                {slides.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: i === slideIndex ? colors.primary : colors.border,
                        width: i === slideIndex ? 24 : 8,
                      },
                    ]}
                  />
                ))}
              </View>

              {slideIndex === slides.length - 1 ? (
                <Button title="Get Started" onPress={finishOnboarding} size="sm" />
              ) : (
                <Pressable onPress={handleNext} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <View style={[styles.navBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="arrow-forward" size={22} color="#FFF" />
                  </View>
                </Pressable>
              )}
            </View>

            <View style={styles.skipArea}>
              {slideIndex < slides.length - 1 && (
                <Pressable onPress={handleSkip} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
                  <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  imageWrap: {
    width: width - spacing.lg * 2,
    height: height * 0.48,
    marginHorizontal: spacing.lg,
    marginTop: height * 0.08,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.lg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h1,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodySmall,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  skipArea: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  skipText: {
    ...typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
});