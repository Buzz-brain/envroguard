import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { typography, spacing } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';

const { height } = Dimensions.get('window');

export default function LandingScreen({ navigation }: any) {
  const colors = useColors();
  return (
    <LinearGradient
      colors={['#059669', '#047857', '#065F46']}
      style={styles.container}
    >
      <View style={styles.topSection}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)']}
            style={styles.iconCircle}
          >
            <Ionicons name="leaf" size={48} color="#FFF" />
          </LinearGradient>
        </View>
        <Text style={styles.title}>EnviroGuard</Text>
        <Text style={styles.subtitle}>
          Report environmental hazards in your campus. Make your school cleaner, safer, and greener.
        </Text>
      </View>

      <View style={styles.featuresRow}>
        {[
          { icon: 'camera-outline', label: 'Snap & Report' },
          { icon: 'location-outline', label: 'Pin Location' },
          { icon: 'checkbox-outline', label: 'Track Status' },
        ].map((f, i) => (
          <View key={i} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon as any} size={24} color="#FFF" />
            </View>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <Button
          title="Get Started"
          onPress={() => navigation.navigate('RoleSelect')}
          size="lg"
          style={styles.button}
          textStyle={{ color: colors.primary, fontSize: 18 }}
        />
        <Text style={styles.footerText}>
          Join thousands keeping their campus safe
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingTop: height * 0.12,
    paddingBottom: spacing.xxl,
  },
  topSection: {
    alignItems: 'center',
  },
  iconContainer: {
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
    fontSize: 40,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  featureLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  bottomSection: {
    alignItems: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
  },
  footerText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
});
