import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  hint?: string;
}

export function EmptyState({ icon = 'document-text-outline', title, message, hint }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={colors.textTertiary} />
      <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
        {title}
      </Text>
      {message && (
        <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
          {message}
        </Text>
      )}
      {hint && (
        <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.lg }]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
