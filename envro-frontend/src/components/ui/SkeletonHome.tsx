import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';
import { spacing } from '../../constants';

function StatItem() {
  return (
    <View style={s.statCard}>
      <Skeleton width={28} height={28} borderRadius={8} />
      <Skeleton width={28} height={20} />
      <Skeleton width={40} height={10} />
    </View>
  );
}

function QuickActionItem() {
  return (
    <View style={{ alignItems: 'center', flex: 1, gap: 6 }}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <Skeleton width={50} height={10} />
    </View>
  );
}

function CategoryGridItem() {
  return (
    <View style={s.catItem}>
      <Skeleton width={36} height={36} borderRadius={10} />
      <Skeleton width={50} height={10} style={{ marginTop: 4 }} />
    </View>
  );
}

export function SkeletonHome() {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.container}>
      {/* Hero section */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width={120} height={14} />
            <Skeleton width={100} height={20} />
            <Skeleton width={160} height={11} />
          </View>
          <Skeleton width={48} height={48} borderRadius={24} />
        </View>
        <View style={s.statsRow}>
          <StatItem />
          <StatItem />
          <StatItem />
          <StatItem />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={s.quickActions}>
        <QuickActionItem />
        <QuickActionItem />
        <QuickActionItem />
      </View>

      {/* Section header */}
      <View style={s.sectionHead}>
        <Skeleton width={130} height={16} />
        <Skeleton width={70} height={14} />
      </View>

      {/* Category grid */}
      <View style={s.catGrid}>
        <CategoryGridItem />
        <CategoryGridItem />
        <CategoryGridItem />
        <CategoryGridItem />
        <CategoryGridItem />
        <CategoryGridItem />
      </View>

      {/* Recent activity header */}
      <View style={s.sectionHead}>
        <Skeleton width={110} height={16} />
        <Skeleton width={50} height={14} />
      </View>

      {/* Report cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={s.reportCard}>
          <Skeleton width={4} height={120} borderRadius={2} style={s.accent} />
          <View style={s.cardBody}>
            <View style={s.cardTop}>
              <Skeleton width={32} height={32} borderRadius={9} />
              <View style={{ flex: 1 }}>
                <Skeleton height={15} width="60%" />
              </View>
              <Skeleton width={70} height={22} borderRadius={11} />
            </View>
            <Skeleton height={12} width="85%" style={{ marginTop: spacing.xs }} />
            <View style={s.cardBottom}>
              <Skeleton width={60} height={16} borderRadius={8} />
              <Skeleton width={80} height={12} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  hero: {
    padding: spacing.lg,
    paddingTop: spacing.xxxl + 20,
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 4,
  },


  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  catItem: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reportCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  accent: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
