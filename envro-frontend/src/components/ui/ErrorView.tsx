import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';

type ErrorViewProps = {
  icon?: string;
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  isOffline?: boolean;
};

export default function ErrorView({
  icon,
  title,
  message,
  retryLabel = 'Retry',
  onRetry,
  isOffline,
}: ErrorViewProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Ionicons
        name={(icon || (isOffline ? 'cloud-offline-outline' : 'alert-circle-outline')) as any}
        size={48}
        color={isOffline ? colors.danger : colors.textTertiary}
      />
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      <Text style={[styles.message, { color: isOffline ? colors.danger : colors.textSecondary }]}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          onPress={onRetry}
        >
          <Ionicons name="refresh" size={16} color="#FFF" />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (c: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    title: {
      ...typography.h3,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    message: {
      ...typography.body,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 22,
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.lg,
      borderRadius: 8,
      marginTop: spacing.lg,
    },
    retryText: {
      color: '#FFF',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 14,
    },
  });
