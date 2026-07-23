import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { typography, spacing, borderRadius, REPORT_STATUS, categoryColors as cc } from '../../constants';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { reportsApi } from '../../api/reports';
import { useColors } from '../../contexts/ThemeContext';
import { lightColors } from '../../constants/theme';
import { formatDate } from '../../utils/helpers';
import { impactLight } from '../../utils/haptics';
import type { HazardReport } from '../../types';

const catIcons: Record<string, string> = {
  Flooding: 'water',
  'Waste Dumping': 'trash',
  Pollution: 'flask',
  'Blocked Drainage': 'funnel',
  'Dirty Environment': 'brush',
  Others: 'alert-circle',
};

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Pending', value: REPORT_STATUS.PENDING },
  { label: 'Under Review', value: REPORT_STATUS.UNDER_REVIEW },
  { label: 'In Progress', value: REPORT_STATUS.IN_PROGRESS },
  { label: 'Resolved', value: REPORT_STATUS.RESOLVED },
];

const PAGE_SIZE = 20;

export default function MyReportsScreen({ navigation }: any) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReports = useCallback(async (pageNum = 1, append = false) => {
    try {
      setFetchError(null);
      const params: any = { page: pageNum, limit: PAGE_SIZE };
      if (activeFilter) params.status = activeFilter;
      const { data } = await reportsApi.getMyReports(params);
      if (data.success) {
        setReports(prev => append ? [...prev, ...data.data] : data.data);
        setHasMore(data.data.length === PAGE_SIZE);
        setPage(pageNum);
      }
    } catch (err: any) { setFetchError(getFriendlyErrorMessage(err, 'reports')); }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [activeFilter]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchReports(1);
  }, [fetchReports]));

  useAutoRetry(() => { setPage(1); setHasMore(true); fetchReports(1); }, !loading);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchReports(page + 1, true);
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const activeCount = reports.filter(r => r.status === 'in_progress' || r.status === 'under_review').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Reports</Text>
          <Text style={styles.subtitle}>{loading ? '...' : `${reports.length} report${reports.length !== 1 ? 's' : ''}`}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { impactLight(); navigation.navigate('Report'); }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── Stats Bar ── */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.statValue}>{loading ? '—' : pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#8B5CF6' }]} />
          <Text style={styles.statValue}>{loading ? '—' : activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.statValue}>{loading ? '—' : resolvedCount}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* ── Filters ── */}
      <View style={styles.filterRow}>
        {statusFilters.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, activeFilter === f.value && styles.filterChipActive]}
            onPress={() => { impactLight(); setActiveFilter(f.value); setLoading(true); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <SkeletonList variant="accent-card" />
        </View>
      ) : (
      <FlatList
        data={reports}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); setPage(1); setHasMore(true); fetchReports(1); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoading}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>Loading more...</Text>
          </View>
        ) : null}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No Reports Yet"
            message="Your submitted hazard reports will appear here."
            hint="Pull down to refresh"
          />
        }
        renderItem={({ item }) => {
          const catColor = cc[item.category] || '#6B7280';
          return (
            <TouchableOpacity
              onPress={() => { impactLight(); navigation.navigate('ReportDetail', { reportId: item._id }); }}
              activeOpacity={0.7}
            >
              <View style={styles.reportCard}>
                <View style={[styles.cardAccent, { backgroundColor: catColor }]} />
                <View style={styles.cardBody}>
                  {/* Top row: icon + title + badge */}
                  <View style={styles.cardTop}>
                    <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryBg }]}>
                      <Ionicons name={catIcons[item.category] as any} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.cardCategory}>{item.category}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>

                  {/* Description */}
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

                  {/* Bottom: date + chevron */}
                  <View style={styles.cardBottom}>
                    <View style={styles.cardMeta}>
                      <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
                      <Text style={styles.cardMetaText}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      )}
    </View>
  );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statValue: {
    ...typography.label,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: 'center',
    height: 24,
  },

  // ── Filters ──
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },

  // ── List ──
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  footerText: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // ── Report Card ──
  reportCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
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
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  cardCategory: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 1,
  },
  cardDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
