import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius, shadows } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { hapticFeedback } from '../../services/HapticService';
import { SoundService } from '../../services/SoundService';

const { width, height } = Dimensions.get('window');

const roles = [
  {
    id: 'student',
    title: 'Student',
    description: 'Report hazards and track your submissions',
    icon: 'school-outline',
    route: 'StudentLogin',
    gradient: ['#059669', '#047857'] as [string, string],
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Manage reports, students, and system settings',
    icon: 'shield-checkmark-outline',
    route: 'AdminLogin',
    gradient: ['#1E40AF', '#1D4ED8'] as [string, string],
  },
];

export default function WelcomeRoleScreen({ navigation }: any) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(card1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(card2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleRolePress = (route: string) => {
    hapticFeedback.light();
    SoundService.info();
    navigation.navigate('AuthFlow', { screen: route });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={require('../../../proposed-assets/splash-image-bl.png')}
        style={styles.imageTopLeft}
        resizeMode="contain"
        blurRadius={0.3}
      />

      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.headerIcon}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="leaf" size={40} color={colors.primary} />
          </View>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Welcome</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Let's work together to keep our campus clean, safe, and environmentally friendly.
        </Text>
      </Animated.View>

      <View style={styles.rolesSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Who are you?</Text>

        {roles.map((role, i) => {
          const animVal = i === 0 ? card1Anim : card2Anim;
          return (
            <Animated.View
              key={role.id}
              style={{ opacity: animVal, transform: [{ translateY: animVal.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}
            >
              <Pressable
                onPress={() => handleRolePress(role.route)}
                style={({ pressed }) => [
                  styles.cardPress,
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <LinearGradient
                  colors={role.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.roleCard}
                >
                  <View style={styles.roleIconWrap}>
                    <Ionicons name={role.icon as any} size={30} color="#FFF" />
                  </View>
                  <View style={styles.roleTextBlock}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleDesc}>{role.description}</Text>
                  </View>
                  <View style={styles.arrowCircle}>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  imageTopLeft: {
    position: 'absolute',
    top: -20,
    left: -30,
    width: width * 0.4,
    height: height * 0.22,
    opacity: 0.2,
  },
  header: {
    alignItems: 'center',
    paddingTop: height * 0.1,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    fontSize: 34,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
  },
  rolesSection: {
    flex: 1,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  cardPress: {
    borderRadius: borderRadius.xl,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    minHeight: 88,
  },
  roleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleTextBlock: {
    flex: 1,
  },
  roleTitle: {
    ...typography.h4,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  roleDesc: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});