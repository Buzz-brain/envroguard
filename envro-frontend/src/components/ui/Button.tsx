import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { spacing, borderRadius, typography, shadows } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const colors = useColors();
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  const bgColor = disabled
    ? colors.border
    : isPrimary
    ? colors.primary
    : isSecondary
    ? colors.secondary
    : isDanger
    ? colors.danger
    : 'transparent';

  const txtColor = disabled
    ? colors.textTertiary
    : isPrimary || isSecondary || isDanger
    ? colors.textInverse
    : isOutline
    ? colors.primary
    : colors.text;

  const height = size === 'sm' ? 40 : size === 'lg' ? 56 : 48;
  const padHorizontal = size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          height,
          paddingHorizontal: padHorizontal,
          borderWidth: isOutline ? 1.5 : 0,
          borderColor: disabled ? colors.border : colors.primary,
        },
        isPrimary && !disabled && shadows.sm,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={txtColor} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              typography.button,
              { color: txtColor, marginLeft: icon ? spacing.sm : 0 },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
});
