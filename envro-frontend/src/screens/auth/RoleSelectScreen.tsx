import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius, shadows } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';

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

export default function RoleSelectScreen({ navigation }: any) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Who are you?</Text>
      <Text style={styles.subtitle}>
        Select your role to continue
      </Text>

      <View style={styles.rolesContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            activeOpacity={0.9}
            onPress={() => navigation.navigate(role.route)}
            style={[shadows.lg]}
          >
            <LinearGradient
              colors={role.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roleCard}
            >
              <View style={styles.roleIcon}>
                <Ionicons name={role.icon as any} size={32} color="#FFF" />
              </View>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
              <View style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  title: {
    ...typography.h1,
    color: '#1F2937',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: '#6B7280',
    marginBottom: spacing.xl,
  },
  rolesContainer: {
    gap: spacing.md,
  },
  roleCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    minHeight: 160,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: spacing.xs,
  },
  roleDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  arrowCircle: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
