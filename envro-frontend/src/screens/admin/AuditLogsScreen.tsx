import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { typography, spacing, borderRadius } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { auditLogsApi } from '../../api/auditLogs';
import { formatDate } from '../../utils/helpers';
import type { AuditLog } from '../../types';

const PAGE_SIZE = 20;

const actionIcons: Record<string, string> = {
  create_report: 'document-text',
  update_report_status: 'swap-horizontal',
  assign_report: 'person-add',
  delete_report: 'trash',
  create_faculty: 'business',
  update_faculty: 'business',
  toggle_faculty_activate: 'checkmark-circle',
  toggle_faculty_deactivate: 'close-circle',
  delete_faculty: 'trash',
  create_department: 'layers',
  update_department: 'layers',
  toggle_department_activate: 'checkmark-circle',
  toggle_department_deactivate: 'close-circle',
  delete_department: 'trash',
  import_students: 'people',
  batch_create_students: 'people',
  delete_student: 'person-remove',
};

const actionLabels: Record<string, string> = {
  create_report: 'Report Submitted',
  update_report_status: 'Status Changed',
  assign_report: 'Report Assigned',
  delete_report: 'Report Deleted',
  create_faculty: 'Faculty Created',
  update_faculty: 'Faculty Updated',
  toggle_faculty_activate: 'Faculty Activated',
  toggle_faculty_deactivate: 'Faculty Deactivated',
  delete_faculty: 'Faculty Deleted',
  create_department: 'Department Created',
  update_department: 'Department Updated',
  toggle_department_activate: 'Department Activated',
  toggle_department_deactivate: 'Department Deactivated',
  delete_department: 'Department Deleted',
  import_students: 'Students Imported',
  batch_create_students: 'Students Created',
  delete_student: 'Student Deleted',
};

const getActionIcon = (action: string) => actionIcons[action] || 'ellipse';
const getActionLabel = (action: string) => actionLabels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AuditLogsScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ entityType: '', action: '', search: '', dateFrom: '', dateTo: '' });
  const [activeFilters, setActiveFilters] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const buildParams = useCallback((pageNum = 1, f = filters) => {
    const params: Record<string, string | number> = { page: pageNum, limit: PAGE_SIZE };
    if (f.entityType) params.entityType = f.entityType;
    if (f.action) params.action = f.action;
    if (f.search) params.search = f.search;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    return params;
  }, []);

  const countActiveFilters = (f: typeof filters) => Object.values(f).filter(Boolean).length;

  const fetchLogs = useCallback(async (pageNum = 1, append = false) => {
    try {
      setFetchError(null);
      const { data } = await auditLogsApi.getAll(buildParams(pageNum, append ? filters : filters));
      if (data.success) {
        setLogs(prev => append ? [...prev, ...data.data] : data.data);
        setHasMore(data.data.length === PAGE_SIZE);
        setPage(pageNum);
      }
    } catch (err: any) { setFetchError(getFriendlyErrorMessage(err, 'audit')); }
    finally { setLoading(false); setHasLoaded(true); setRefreshing(false); setLoadingMore(false); }
  }, [buildParams, filters]);

  const applyFilters = () => {
    setActiveFilters(countActiveFilters(filters));
    setShowFilters(false);
    setLoading(true);
    setHasLoaded(false);
    setPage(1);
    setHasMore(true);
    fetchLogs(1);
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setHasLoaded(false);
    setPage(1);
    setHasMore(true);
    fetchLogs(1);
  }, [fetchLogs]));

  useAutoRetry(() => { setPage(1); setHasMore(true); fetchLogs(1); }, !loading);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchLogs(page + 1, true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Audit Log</Text>
          <Text style={styles.subtitle}>{loading ? '...' : `${logs.length} entries`}</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7} onPress={() => setShowFilters(true)}>
          <Ionicons name="funnel-outline" size={20} color={activeFilters > 0 ? colors.primary : colors.textSecondary} />
          {activeFilters > 0 && <View style={styles.filterBadge}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{activeFilters}</Text></View>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <SkeletonList variant="notification-card" />
        </View>
      ) : (
      <FlatList
        data={logs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); setHasMore(true); fetchLogs(1); }} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <View style={{ padding: spacing.lg, alignItems: 'center' }}><Text style={[typography.caption, { color: colors.textTertiary }]}>Loading more...</Text></View> : null}
        ListEmptyComponent={
          hasLoaded ? <EmptyState icon="document-text-outline" title="No Activity" message="No audit log entries yet" /> : null
        }
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <View style={styles.logDot}>
              <Ionicons name={getActionIcon(item.action) as any} size={18} color={colors.primary} />
            </View>
            <View style={styles.logContent}>
              <Text style={[styles.logAction, { color: colors.text }]}>{getActionLabel(item.action)}</Text>
              <Text style={[styles.logDesc, { color: colors.textSecondary }]}>{item.description}</Text>
              {item.actorName && (
                <Text style={[styles.logActor, { color: colors.textTertiary }]}>by {item.actorName}</Text>
              )}
              <Text style={[styles.logTime, { color: colors.textTertiary }]}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        )}
      />
      )}
      {/* ── Filter Modal ── */}
      <Modal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
          <TouchableOpacity style={[styles.filterModal, { backgroundColor: colors.surface, shadowColor: '#000' }]} activeOpacity={1}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filter Audit Logs</Text>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Search (actor or description)</Text>
            <TextInput style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. john@..." placeholderTextColor={colors.textTertiary} value={filters.search} onChangeText={(v) => setFilters({ ...filters, search: v })} />

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Entity Type</Text>
            <TextInput style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. Report, Faculty, Department, Student, Admin" placeholderTextColor={colors.textTertiary} value={filters.entityType} onChangeText={(v) => setFilters({ ...filters, entityType: v })} />

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Action</Text>
            <TextInput style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. create_report, update_report_status..." placeholderTextColor={colors.textTertiary} value={filters.action} onChangeText={(v) => setFilters({ ...filters, action: v })} />

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date From (YYYY-MM-DD)</Text>
            <TextInput style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. 2025-01-01" placeholderTextColor={colors.textTertiary} value={filters.dateFrom} onChangeText={(v) => setFilters({ ...filters, dateFrom: v })} />

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date To (YYYY-MM-DD)</Text>
            <TextInput style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. 2025-12-31" placeholderTextColor={colors.textTertiary} value={filters.dateTo} onChangeText={(v) => setFilters({ ...filters, dateTo: v })} />

            <View style={styles.filterActions}>
              <TouchableOpacity onPress={() => { setFilters({ entityType: '', action: '', search: '', dateFrom: '', dateTo: '' }); setActiveFilters(0); setShowFilters(false); }}><Text style={[typography.bodySmall, { color: colors.textTertiary }]}>Clear</Text></TouchableOpacity>
              <Button title="Apply" onPress={applyFilters} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.md,
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
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  logItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  logDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  logContent: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
    paddingBottom: spacing.md,
  },
  logAction: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  logDesc: {
    ...typography.caption,
    marginTop: 2,
  },
  logActor: {
    ...typography.caption,
    marginTop: 2,
  },
  logTime: {
    ...typography.caption,
    marginTop: 4,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  filterModal: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  filterTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  filterLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  filterInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.bodySmall,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
