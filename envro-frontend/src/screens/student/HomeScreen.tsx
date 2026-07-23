import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonHome } from '../../components/ui/SkeletonHome';
import { typography, spacing, borderRadius, HAZARD_CATEGORIES, categoryColors } from '../../constants';
import { lightColors } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { reportsApi } from '../../api/reports';
import { useAuth } from '../../contexts/AuthContext';
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

const statusColors: Record<string, string> = {
  pending: '#F59E0B',
  under_review: '#3B82F6',
  in_progress: '#8B5CF6',
  resolved: '#10B981',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function StatCard({ label, count, icon, color }: { label: string; count: number; icon: string; color: string }) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={14} color="#FFFFFF" />
      </View>
      <Text style={statStyles.count}>{formatCount(count)}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 2,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  count: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
});

export default function StudentHome({ navigation }: any) {
  const colors = useColors();
  const styles = getStyles(colors);
  const { user } = useAuth();

  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setFetchError(null);
      const { data } = await reportsApi.getMyReports({ page: 1, limit: 5 });
      if (data.success) setReports(data.data);
    } catch (err: any) { setFetchError(getFriendlyErrorMessage(err, 'dashboard')); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchReports(); }, [fetchReports]));

  useAutoRetry(fetchReports, !loading);

  const initial = (user?.fullName?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const pending = reports.filter(r => r.status === 'pending').length;
  const resolved = reports.filter(r => r.status === 'resolved').length;
  const active = reports.filter(r => r.status === 'in_progress' || r.status === 'under_review').length;
  const all = reports.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReports(); }} />
      }
    >
      {/* ── Hero Section ── */}
      <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroBg}>
          <Ionicons name="leaf" size={140} color="rgba(255,255,255,0.06)" style={styles.heroWatermark} />
        </View>
        <View style={styles.heroContent}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.heroName}>{user?.fullName || 'Student'}</Text>
              <Text style={styles.heroSub}>Track and report environmental hazards on campus</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Reports" count={all} icon="document-text" color="#059669" />
            <StatCard label="Pending" count={pending} icon="time" color="#FBBF24" />
            <StatCard label="Active" count={active} icon="sync" color="#A78BFA" />
            <StatCard label="Done" count={resolved} icon="checkmark-circle" color="#34D399" />
          </View>
        </View>
      </LinearGradient>

      {/* ── Quick Actions ── */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => { impactLight(); navigation.navigate('Report'); }}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#059669', '#047857']} style={styles.qaGradient}>
            <Ionicons name="camera" size={22} color="#FFF" />
          </LinearGradient>
          <Text style={styles.qaLabel}>New Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => { impactLight(); navigation.navigate('Reports'); }}
          activeOpacity={0.8}
        >
          <View style={[styles.qaCircle, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="list" size={22} color={colors.primary} />
          </View>
          <Text style={styles.qaLabel}>My Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => { impactLight(); navigation.navigate('Notifications'); }}
          activeOpacity={0.8}
        >
          <View style={[styles.qaCircle, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="notifications" size={22} color="#4F46E5" />
          </View>
          <Text style={styles.qaLabel}>Alerts</Text>
        </TouchableOpacity>
      </View>

      {/* ── Hazard Categories Grid ── */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Report a Hazard</Text>
        <TouchableOpacity onPress={() => { impactLight(); navigation.navigate('Report'); }}>
          <Text style={styles.sectionAction}>Quick Report</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryGrid}>
        {HAZARD_CATEGORIES.map((cat, i) => (
          <TouchableOpacity
            key={i}
            style={styles.categoryCard}
            onPress={() => { impactLight(); navigation.navigate('Report', { category: cat }); }}
            activeOpacity={0.7}
          >
            <View style={[styles.categoryIconWrap, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name={catIcons[cat] as any} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.categoryLabel, { color: colors.text }]} numberOfLines={1}>
              {cat === 'Dirty Environment' ? 'Littering' : cat === 'Blocked Drainage' ? 'Drainage' : cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Recent Activity ── */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
          <Text style={styles.sectionAction}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingBottom: spacing.xxxl }}>
        {loading ? (
          <View style={{ padding: spacing.lg }}>
            <SkeletonHome />
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="leaf-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[typography.h4, { color: colors.text, marginTop: spacing.md }]}>No Reports Yet</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              Your campus is clean! When you spot a hazard,{'\n'}tap the camera icon above.
            </Text>
          </View>
        ) : (
          reports.map((report) => {
            const catColor = categoryColors[report.category] || '#6B7280';
            return (
              <TouchableOpacity
                key={report._id}
                onPress={() => { impactLight(); navigation.navigate('ReportDetail', { reportId: report._id }); }}
                activeOpacity={0.7}
              >
                <View style={styles.reportCard}>
                  <View style={[styles.cardAccent, { backgroundColor: catColor }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryBg }]}>
                        <Ionicons name={catIcons[report.category] as any} size={16} color={colors.primary} />
                      </View>
                      <View style={styles.cardTitleWrap}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{report.title}</Text>
                      </View>
                      <StatusBadge status={report.status} />
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={1}>{report.description}</Text>
                    <View style={styles.cardBottom}>
                      <View style={[styles.categoryTag, { backgroundColor: colors.primaryBg }]}>
                        <Text style={[typography.caption, { fontSize: 11, color: colors.primary, fontWeight: '600' }]}>
                          {report.category}
                        </Text>
                      </View>
                      <Text style={[typography.caption, { color: colors.textTertiary }]}>
                        {formatDate(report.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (c: typeof lightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },

  // ── Hero ──
  hero: {
    paddingBottom: spacing.lg,
  },
  heroBg: {
    position: 'absolute',
    top: 0, right: 0,
  },
  heroWatermark: {
    position: 'absolute',
    top: -20,
    right: -20,
  },
  heroContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxxl + 20,
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  greeting: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
  },
  heroName: {
    ...typography.h1,
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroSub: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // ── Quick Actions ──
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  qaGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: c.text,
    fontSize: 11,
    textAlign: 'center',
  },

  // ── Section Header ──
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: c.text,
  },
  sectionAction: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: c.primary,
  },

  // ── Category Grid ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryCard: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.lg,
    backgroundColor: c.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Report Card ──
  reportCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: c.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: c.border,
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
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: c.text,
  },
  cardDesc: {
    ...typography.caption,
    color: c.textSecondary,
    marginTop: spacing.xs,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  categoryTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
});
