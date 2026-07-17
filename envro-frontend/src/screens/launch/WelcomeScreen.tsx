import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { spacing, typography, shadows } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { hapticFeedback } from '../../services/HapticService';
import { SoundService } from '../../services/SoundService';

const { height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const btnScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleContinue = async () => {
    SoundService.info();
    hapticFeedback.light();
    navigation.navigate('Auth', { screen: 'RoleSelect' });
  };

  return (
    <LinearGradient
      colors={['#059669', '#047857', '#065F46']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)']}
            style={styles.iconCircle}
          >
            <Ionicons name="leaf" size={48} color="#FFF" />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtext}>
          Let's work together to keep our campus clean, safe, and environmentally friendly.
        </Text>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
        <Button
          title="Continue"
          onPress={handleContinue}
          size="lg"
          style={styles.button}
          textStyle={{ color: '#059669', fontSize: 18 }}
        />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingTop: height * 0.18,
    paddingBottom: spacing.xxl,
  },
  content: {
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    ...typography.h1,
    color: '#FFFFFF',
    fontSize: 38,
    marginBottom: spacing.md,
  },
  subtext: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 340,
  },
  button: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...shadows.lg,
  },
});
