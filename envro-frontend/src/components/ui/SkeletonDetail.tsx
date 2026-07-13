import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Skeleton } from './Skeleton';
import { spacing } from '../../constants';

const { width } = Dimensions.get('window');

function InfoCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={s.infoCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Skeleton width={18} height={18} borderRadius={4} />
        <Skeleton width={90} height={12} />
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={11} width={i === lines - 1 ? '55%' : '90%'} style={{ marginTop: 4 }} />
      ))}
    </View>
  );
}

export function SkeletonDetail() {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.container}>
      {/* Hero image */}
      <Skeleton width={width} height={width * 0.55} borderRadius={0} />

      {/* Overlapping hero card */}
      <View style={s.heroCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Skeleton width={48} height={48} borderRadius={12} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton height={16} width="70%" />
            <Skeleton height={11} width="40%" />
          </View>
          <Skeleton width={80} height={22} borderRadius={11} />
        </View>
        <Skeleton width={90} height={16} borderRadius={8} style={{ marginTop: spacing.sm }} />
      </View>

      {/* Description */}
      <InfoCard lines={4} />

      {/* Location */}
      <InfoCard lines={2} />

      {/* Reporter */}
      <View style={s.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Skeleton width={18} height={18} borderRadius={4} />
          <Skeleton width={90} height={12} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton height={14} width="45%" />
            <Skeleton height={11} width="55%" />
          </View>
        </View>
      </View>

      {/* Timeline */}
      <View style={s.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Skeleton width={18} height={18} borderRadius={4} />
          <Skeleton width={80} height={12} />
        </View>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Skeleton width={10} height={10} borderRadius={5} />
              {i < 2 && <Skeleton width={2} height={24} />}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Skeleton height={14} width="35%" />
              <Skeleton height={10} width="60%" />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    marginTop: -60,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.sm,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
