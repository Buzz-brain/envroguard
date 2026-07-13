import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Skeleton } from './Skeleton';
import { spacing } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export const DashboardSkeleton: React.FC = () => {
  const colors = useColors();
  const cardW = (width - spacing.lg * 2 - spacing.sm * 2) / 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <Skeleton height={28} width={180} />
        <View style={{ height: 8 }} />
        <Skeleton height={16} width={120} />
      </View>

      {/* Stat cards grid */}
      <View style={styles.statsGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.statCard, { width: cardW }]}>
            <Skeleton height={40} width={40} borderRadius={20} />
            <View style={{ height: spacing.sm }} />
            <Skeleton height={28} width={50} />
            <View style={{ height: 4 }} />
            <Skeleton height={12} width={60} />
          </View>
        ))}
      </View>

      {/* Bar chart skeleton */}
      <View style={styles.chartCard}>
        <Skeleton height={18} width={120} style={{ marginBottom: spacing.md }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.barRow}>
            <Skeleton height={12} width={80} />
            <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
              <Skeleton height={8} borderRadius={4} width={`${40 + Math.random() * 50}%`} />
            </View>
            <Skeleton height={12} width={30} />
          </View>
        ))}
      </View>

      {/* Recent reports skeleton */}
      <View style={styles.chartCard}>
        <Skeleton height={18} width={140} style={{ marginBottom: spacing.md }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.reportItem}>
            <Skeleton height={16} width="70%" />
            <View style={{ height: 4 }} />
            <Skeleton height={12} width="40%" />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: spacing.lg, paddingTop: spacing.xxxl },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  chartCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reportItem: {
    marginBottom: spacing.md,
  },
});
