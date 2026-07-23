import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { typography, spacing, borderRadius, REPORT_STATUS, HAZARD_CATEGORIES, statusColors as sc, categoryColors as cc, categoryIcons } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { reportsApi } from '../../api/reports';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { ToastService } from '../../services/ToastService';
import { formatDate } from '../../utils/helpers';
import type { HazardReport } from '../../types';

const PAGE_SIZE = 20;

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Pending', value: REPORT_STATUS.PENDING },
  { label: 'Under Review', value: REPORT_STATUS.UNDER_REVIEW },
  { label: 'In Progress', value: REPORT_STATUS.IN_PROGRESS },
  { label: 'Resolved', value: REPORT_STATUS.RESOLVED },
];

export default function ReportsScreen({ navigation, route }: any) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(route?.params?.status || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reportStats, setReportStats] = useState({ pending: 0, active: 0, resolved: 0 });
  const [deleteTarget, setDeleteTarget] = useState<HazardReport | null>(null);
  const [actionTarget, setActionTarget] = useState<HazardReport | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [totalReports, setTotalReports] = useState(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReports = useCallback(async (pageNum = 1, append = false) => {
    try {
      setFetchError(null);
      const params: any = { page: pageNum, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter) params.category = categoryFilter;
      const { data } = await reportsApi.getAllReports(params);
      if (data.success) {
        setReports(prev => append ? [...prev, ...data.data] : data.data);
        setHasMore(data.data.length === PAGE_SIZE);
        setPage(pageNum);
        if (!append) setTotalReports(data.meta?.pagination?.total ?? data.data.length);
      }
    } catch (err: any) { setFetchError(getFriendlyErrorMessage(err, 'reports')); }
    finally { setLoading(false); setHasLoaded(true); setRefreshing(false); setLoadingMore(false); }
  }, [statusFilter, debouncedSearch, categoryFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await reportsApi.getReportStats();
      if (data.success) {
        setReportStats({
          pending: data.data.pendingReports ?? 0,
          active: data.data.inProgressReports ?? 0,
          resolved: data.data.resolvedReports ?? 0,
        });
      }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchReports(1, false);
    fetchStats();
  }, [fetchReports, fetchStats]));

  useAutoRetry(() => { setPage(1); setHasMore(true); fetchReports(1); }, !loading);

  useEffect(() => {
    const incoming = route.params?.status;
    if (incoming !== undefined) setStatusFilter(incoming);
  }, [route.params?.status]);

  useEffect(() => () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); }, []);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchReports(page + 1, true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    try {
      await reportsApi.deleteReport(deleteTarget._id);
      setReports(prev => prev.filter(r => r._id !== deleteTarget._id));
      setTotalReports(prev => Math.max(0, prev - 1));
      setDeleteTarget(null);
      ToastService.success('Report Deleted', 'The report has been removed.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to delete report');
      setDeleteError(err.response?.data?.message || 'Failed to delete report');
    }
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(text), 400);
  };

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>{loading ? '...' : `${totalReports} report${totalReports !== 1 ? 's' : ''}`}</Text>
        </View>
      </View>

      {/* ── Stats Bar ── */}
      {!loading && (
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: sc.pending }]} />
          <Text style={styles.statValue}>{reportStats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: sc.in_progress }]} />
          <Text style={styles.statValue}>{reportStats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: sc.resolved }]} />
          <Text style={styles.statValue}>{reportStats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>
      )}

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, description, or reporter..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={handleSearchChange}
        />
        {search ? (
          <TouchableOpacity onPress={clearSearch} style={styles.searchClear}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Filter Chips ── */}
      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={(item) => 's-' + item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === item.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(item.value)}
              activeOpacity={0.7}
            >
              {item.value ? (
                <View style={[styles.filterChipDot, statusFilter === item.value && { backgroundColor: colors.textInverse }]} />
              ) : null}
              <Text style={[styles.filterChipText, statusFilter === item.value && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
        <FlatList
          horizontal
          data={[{ label: 'All Categories', value: '' }, ...HAZARD_CATEGORIES.map(c => ({ label: c, value: c }))]}
          keyExtractor={(item) => 'c-' + item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, styles.filterChipCat, categoryFilter === item.value && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={() => setCategoryFilter(item.value)}
              activeOpacity={0.7}
            >
              {item.value ? (
                <Ionicons name={categoryIcons[item.value] as any} size={14} color={colors.primary} style={styles.filterChipIcon} />
              ) : null}
              <Text style={[styles.filterChipText, categoryFilter === item.value && { color: colors.primary, fontWeight: '700' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Report List ── */}
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
            onRefresh={() => { setRefreshing(true); setPage(1); setHasMore(true); fetchReports(1); fetchStats(); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.footerText}>Loading more reports...</Text>
          </View>
        ) : !hasMore && reports.length > 0 ? (
          <View style={styles.footerEnd}>
            <View style={[styles.footerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>All reports loaded</Text>
            <View style={[styles.footerLine, { backgroundColor: colors.border }]} />
          </View>
        ) : null}
        ListEmptyComponent={
          hasLoaded ? (
            <EmptyState
              icon="document-text-outline"
              title="No Reports Found"
              message={search || statusFilter || categoryFilter ? 'Try adjusting your filters or search query.' : 'No reports have been submitted yet.'}
              hint="Pull down to refresh"
            />
          ) : null
        }
        renderItem={({ item }) => {
          const catColor = cc[item.category] || '#6B7280';
          return (
            <TouchableOpacity
              onPress={() => { navigation.navigate('ReportDetail', { reportId: item._id }); }}
              activeOpacity={0.7}
            >
              <View style={styles.reportCard}>
                <View style={[styles.cardAccent, { backgroundColor: catColor }]} />
                <View style={styles.cardBody}>
                  {/* Top row: icon + title + badge + action */}
                  <View style={styles.cardTop}>
                 <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryBg }]}>
                   {item.images && item.images.length > 0 ? (
                     <Image source={{ uri: item.images[0].url }} style={styles.cardThumb} resizeMode="cover" />
                   ) : (
                     <Ionicons name={categoryIcons[item.category] as any} size={18} color={colors.primary} />
                   )}
                 </View>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.cardCategory}>{item.category}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                    <TouchableOpacity onPress={() => setActionTarget(item)} style={styles.cardActionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>

                  {/* Description */}
                  <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>

                  {/* Bottom row: reporter + date + chevron */}
                  <View style={styles.cardBottom}>
                    <View style={styles.cardMeta}>
                      <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
                      <Text style={styles.cardMetaText} numberOfLines={1}>
                        {item.studentInfo?.fullName || item.studentInfo?.registrationNumber || 'Unknown'}
                      </Text>
                    </View>
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

      {/* ── Delete Confirmation Modal ── */}
      <Modal visible={deleteTarget !== null} transparent animationType="fade" onRequestClose={() => { setDeleteTarget(null); setDeleteError(''); }}>
        <Pressable style={styles.modalOverlay} onPress={() => { setDeleteTarget(null); setDeleteError(''); }}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmIconWrap}>
              <View style={[styles.confirmIconBg, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
              </View>
            </View>
            {deleteError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{deleteError}</Text>
              </View>
            ) : null}
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Report</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Remove "{deleteTarget?.title}"? This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { setDeleteTarget(null); setDeleteError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.danger }]}
                onPress={handleDeleteConfirm}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Report Actions Sheet ── */}
      <Modal visible={actionTarget !== null} transparent animationType="fade" onRequestClose={() => setActionTarget(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setActionTarget(null)}>
          <Pressable style={[styles.actionSheet, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                const t = actionTarget;
                setActionTarget(null);
                if (t) navigation.navigate('ReportDetail', { reportId: t._id });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={20} color={colors.text} />
              <Text style={[styles.sheetItemText, { color: colors.text }]}>View Report</Text>
            </TouchableOpacity>
            <View style={[styles.sheetDivider, { backgroundColor: colors.borderLight }]} />
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                const t = actionTarget;
                setActionTarget(null);
                if (t) setDeleteTarget(t);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.sheetItemText, { color: colors.danger }]}>Delete Report</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: c.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },

  // ── Stats Bar ──
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: c.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.text,
  },
  statLabel: {
    ...typography.caption,
    color: c.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: c.border,
    alignSelf: 'center',
    height: 24,
  },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    height: 44,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.text,
    marginLeft: spacing.sm,
    height: '100%',
  },
  searchClear: {
    padding: 4,
  },

  // ── Filters ──
  filtersWrap: {
    marginBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  filterChipTextActive: {
    color: c.textInverse,
  },
  filterChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.border,
  },
  filterChipCat: {
    borderColor: c.border,
  },
  filterChipIcon: {
    marginRight: 4,
  },

  // ── List ──
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerText: {
    ...typography.caption,
    color: c.textTertiary,
  },
  footerEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerLine: {
    flex: 1,
    height: 1,
    maxWidth: 60,
  },

  // ── Report Card ──
  reportCard: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    }),
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
    overflow: 'hidden',
  },
  cardThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: c.text,
  },
  cardCategory: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 1,
  },
  cardDesc: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 0,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  cardMetaText: {
    fontSize: 12,
    color: c.textTertiary,
  },
  cardActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Delete Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  modalMessage: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    ...typography.body,
    fontWeight: '600',
  },
  confirmIconWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  confirmIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    width: '100%',
  },
  errorText: {
    ...typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Action Sheet ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    width: '100%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  sheetItemText: {
    ...typography.body,
    fontWeight: '600',
  },
  sheetDivider: {
    height: 1,
  },
});
