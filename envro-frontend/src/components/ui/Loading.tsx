import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { typography } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = 'Loading...', fullScreen = true }: LoadingProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: 12 }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fullScreen: {
    flex: 1,
  },
});
