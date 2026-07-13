import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { spacing, borderRadius, shadows } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md },
        variant === 'elevated' && shadows.md,
        variant === 'outlined' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}


